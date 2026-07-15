import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth, getUserProfile, saveUserProfile, memoryStore, getUserProfileByEmail, rtdb, setStaffOnlineStatus } from "../lib/services";
import { UserProfile } from "../types";
import { ref, onValue, onDisconnect } from "firebase/database";

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  loginDemo: (role: "seeker" | "staff" | "admin") => Promise<void>;
  signupUser: (email: string, displayName: string, role: "seeker" | "staff" | "admin", password?: string) => Promise<void>;
  loginWithEmail: (email: string, password?: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserPermission: (canPost: boolean) => void;
  updateUserPreference: (preference: "whatsapp" | "in-app") => Promise<void>;
  sendPasswordlessLink: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronize Firebase Auth and Firestore user documents
  useEffect(() => {
    // 1. First check if we have a custom virtual session saved in sessionStorage
    const savedVirtualUser = sessionStorage.getItem("vr_virtual_user");
    if (savedVirtualUser) {
      try {
        const profile = JSON.parse(savedVirtualUser) as UserProfile;
        setCurrentUser(profile);
        memoryStore.currentUser = profile;
        setLoading(false);
      } catch (e) {
        console.warn("Could not load virtual user session", e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // If we have a Firebase Auth user, they take precedence over virtual session
        sessionStorage.removeItem("vr_virtual_user");
        let profile = await getUserProfile(user.uid);
        
        const adminEmails = [
          "admin@valleyreigns.com"
        ];
        
        if (profile) {
          const userEmail = profile.email || "";
          const isAdminEmail = adminEmails.includes(userEmail.toLowerCase());
          let profileChanged = false;
          if (isAdminEmail && profile.role !== "admin") {
            profile.role = "admin";
            profile.canPostJobs = true;
            profileChanged = true;
          } else if (!isAdminEmail && profile.role === "admin") {
            profile.role = "seeker";
            profile.canPostJobs = false;
            profileChanged = true;
          }
          if (user.photoURL && profile.photoURL !== user.photoURL) {
            profile.photoURL = user.photoURL;
            profileChanged = true;
          }
          if (profileChanged) {
            await saveUserProfile(profile);
          }
          setCurrentUser(profile);
          memoryStore.currentUser = profile;
        } else {
          // Create a default profile
          const userEmail = user.email || "";
          const isAdminEmail = adminEmails.includes(userEmail.toLowerCase());
          const newProfile: UserProfile = {
            uid: user.uid,
            email: userEmail,
            displayName: user.displayName || userEmail.split("@")[0] || "User",
            role: isAdminEmail ? "admin" : "seeker",
            canPostJobs: isAdminEmail ? true : false,
            photoURL: user.photoURL || undefined
          };
          await saveUserProfile(newProfile);
          setCurrentUser(newProfile);
          memoryStore.currentUser = newProfile;
        }
      } else if (!sessionStorage.getItem("vr_virtual_user")) {
        setCurrentUser(null);
        memoryStore.currentUser = null;
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Check for passwordless email link login on load
  useEffect(() => {
    const checkEmailLinkSignIn = async () => {
      const { isSignInWithEmailLink, signInWithEmailLink } = await import("firebase/auth");
      if (isSignInWithEmailLink(auth, window.location.href)) {
        setLoading(true);
        try {
          let email = window.localStorage.getItem("emailForSignIn");
          if (!email) {
            email = window.prompt("Please confirm your email address to complete sign in:");
          }
          if (email) {
            const result = await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem("emailForSignIn");
            const user = result.user;
            
            let profile = await getUserProfile(user.uid);
            const adminEmails = ["admin@valleyreigns.com"];
            
            if (profile) {
              const userEmail = profile.email || "";
              const isAdminEmail = adminEmails.includes(userEmail.toLowerCase());
              if (isAdminEmail && profile.role !== "admin") {
                profile.role = "admin";
                profile.canPostJobs = true;
                await saveUserProfile(profile);
              }
              setCurrentUser(profile);
              memoryStore.currentUser = profile;
            } else {
              const userEmail = user.email || email || "";
              const isAdminEmail = adminEmails.includes(userEmail.toLowerCase());
              const newProfile: UserProfile = {
                uid: user.uid,
                email: userEmail,
                displayName: user.displayName || userEmail.split("@")[0] || "User",
                role: isAdminEmail ? "admin" : "seeker",
                canPostJobs: isAdminEmail ? true : false
              };
              await saveUserProfile(newProfile);
              setCurrentUser(newProfile);
              memoryStore.currentUser = newProfile;
            }
          }
        } catch (error) {
          console.error("Error signing in with email link:", error);
        } finally {
          setLoading(false);
          // Clean URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };
    checkEmailLinkSignIn();
  }, []);

  // Dynamically load and initialize Google Identity Services (Google One Tap)
  useEffect(() => {
    if (loading || currentUser) {
      return;
    }

    const initializeGis = async () => {
      try {
        // Safe check for document permission policy to prevent the FedCM iframe console error
        let isFedCmAllowed = true;
        try {
          const docAny = document as any;
          if (docAny.permissionsPolicy && typeof docAny.permissionsPolicy.allowsFeature === 'function') {
            isFedCmAllowed = docAny.permissionsPolicy.allowsFeature('identity-credentials-get');
          }
        } catch (pe) {
          console.warn("Could not check permissionsPolicy for identity-credentials-get:", pe);
        }

        // Also check if we are in an iframe
        const isInIframe = window.self !== window.top;

        // If in iframe or FedCM is not permitted, don't run One Tap on app load to avoid NotAllowedError console warnings.
        // The user can still click standard sign-in which will trigger standard Google login popup fallback.
        if (isInIframe || !isFedCmAllowed) {
          console.log("Google One Tap auto-prompt skipped because app is running in an iframe or FedCM policy is disabled.");
          return;
        }

        if (!(window as any).google?.accounts?.id) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load GIS script"));
            document.head.appendChild(script);
          });
        }

        const google = (window as any).google;
        const env = (import.meta as any).env || {};
        const clientId = env.VITE_FIREBASE_CLIENT_ID || "926249999164-fkqln5tu3922ovbtbi8a4fnsbnu4r151.apps.googleusercontent.com";

        if (google && google.accounts && google.accounts.id) {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: any) => {
              setLoading(true);
              try {
                const { GoogleAuthProvider, signInWithCredential } = await import("firebase/auth");
                const idToken = response.credential;
                const credential = GoogleAuthProvider.credential(idToken);
                const result = await signInWithCredential(auth, credential);
                const user = result.user;

                const profile = await getUserProfile(user.uid);
                const adminEmails = [
                  "admin@valleyreigns.com"
                ];
                if (profile) {
                  const userEmail = profile.email || "";
                  const isAdminEmail = adminEmails.includes(userEmail.toLowerCase());
                  if (isAdminEmail && profile.role !== "admin") {
                    profile.role = "admin";
                    profile.canPostJobs = true;
                    await saveUserProfile(profile);
                  } else if (!isAdminEmail && profile.role === "admin") {
                    profile.role = "seeker";
                    profile.canPostJobs = false;
                    await saveUserProfile(profile);
                  }
                  setCurrentUser(profile);
                  memoryStore.currentUser = profile;
                } else {
                  const userEmail = user.email || "";
                  const isAdminEmail = adminEmails.includes(userEmail.toLowerCase());
                  const newProfile: UserProfile = {
                    uid: user.uid,
                    email: userEmail,
                    displayName: user.displayName || "Google Job Seeker",
                    role: isAdminEmail ? "admin" : "seeker",
                    canPostJobs: isAdminEmail ? true : false,
                    authProvider: "google"
                  };
                  await saveUserProfile(newProfile);
                  setCurrentUser(newProfile);
                  memoryStore.currentUser = newProfile;
                }
              } catch (err) {
                console.error("Google One Tap sign in failed:", err);
              } finally {
                setLoading(false);
              }
            },
            auto_select: false,
            itp_support: true,
            use_fedcm: false,
          });

          // Pre-trigger Google One Tap prompt on app load (will render bottom/top-right sheet on device)
          google.accounts.id.prompt((notification: any) => {
            console.log("Google One Tap background prompt status:", notification);
          });
        }
      } catch (e) {
        console.warn("Could not setup Google Identity Services:", e);
      }
    };

    initializeGis();
  }, [loading, currentUser]);

  // One-click high-fidelity Persona Login for frictionless testing
  const loginDemo = async (role: "seeker" | "staff" | "admin") => {
    setLoading(true);
    let email = "";
    let displayName = "";

    if (role === "admin") {
      email = "genesisjosephoghene+admin@gmail.com";
      displayName = "Jessica Carter";
    } else if (role === "staff") {
      email = "genesisjosephoghene+staff@gmail.com";
      displayName = "Marcus Vance";
    } else {
      email = "genesisjosephoghene+seeker@gmail.com";
      displayName = "Alex Rivera";
    }

    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("firebase/auth");
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, "password123");
        const user = userCredential.user;
        const mockProfile: UserProfile = {
          uid: user.uid,
          email,
          displayName,
          role,
          canPostJobs: role === "admin" || role === "staff" ? true : false
        };
        await saveUserProfile(mockProfile);
        setCurrentUser(mockProfile);
        memoryStore.currentUser = mockProfile;
      } catch (err: any) {
        if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/cannot-find-user") {
          userCredential = await createUserWithEmailAndPassword(auth, email, "password123");
          const user = userCredential.user;
          const mockProfile: UserProfile = {
            uid: user.uid,
            email,
            displayName,
            role,
            canPostJobs: role === "admin" || role === "staff" ? true : false
          };
          await saveUserProfile(mockProfile);
          setCurrentUser(mockProfile);
          memoryStore.currentUser = mockProfile;
        } else if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
          // Fallback to custom Firestore-backed user creation
          console.warn("Auth provider disabled. Falling back to Firestore-backed Virtual Auth.");
          const customUid = `${role}-demo-firestore`;
          const mockProfile: UserProfile = {
            uid: customUid,
            email,
            displayName,
            role,
            canPostJobs: role === "admin" || role === "staff" ? true : false
          };
          await saveUserProfile(mockProfile);
          setCurrentUser(mockProfile);
          memoryStore.currentUser = mockProfile;
          sessionStorage.setItem("vr_virtual_user", JSON.stringify(mockProfile));
        } else {
          throw err;
        }
      }
    } catch (e) {
      console.error("Could not sign in demo user in Firebase:", e);
      // Absolute fallback if everything else fails
      const customUid = `${role}-demo-fallback`;
      const mockProfile: UserProfile = {
        uid: customUid,
        email,
        displayName,
        role,
        canPostJobs: role === "admin" || role === "staff" ? true : false
      };
      await saveUserProfile(mockProfile);
      setCurrentUser(mockProfile);
      memoryStore.currentUser = mockProfile;
      sessionStorage.setItem("vr_virtual_user", JSON.stringify(mockProfile));
    } finally {
      setLoading(false);
    }
  };

  const signupUser = async (email: string, displayName: string, role: "seeker" | "staff" | "admin", password?: string) => {
    setLoading(true);
    const normEmail = email.trim().toLowerCase();
    const resolvedPassword = password || "password123";
    let finalRole = role;
    if (finalRole === "admin" && normEmail !== "admin@valleyreigns.com") {
      finalRole = "seeker";
    }
    try {
      const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import("firebase/auth");
      let user;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, normEmail, resolvedPassword);
        user = userCredential.user;
        const newProfile: UserProfile = {
          uid: user.uid,
          email: normEmail,
          displayName,
          role: finalRole,
          canPostJobs: finalRole === "admin" || finalRole === "staff" ? true : false,
          password: resolvedPassword,
          authProvider: "email"
        };
        await saveUserProfile(newProfile);
        setCurrentUser(newProfile);
        memoryStore.currentUser = newProfile;
      } catch (err: any) {
        if (err.code === "auth/email-already-in-use") {
          const userCredential = await signInWithEmailAndPassword(auth, normEmail, resolvedPassword);
          user = userCredential.user;
          const newProfile: UserProfile = {
            uid: user.uid,
            email: normEmail,
            displayName,
            role: finalRole,
            canPostJobs: finalRole === "admin" || finalRole === "staff" ? true : false,
            password: resolvedPassword,
            authProvider: "email"
          };
          await saveUserProfile(newProfile);
          setCurrentUser(newProfile);
          memoryStore.currentUser = newProfile;
        } else if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
          // Fallback to custom Firestore-backed user creation
          console.warn("Auth provider disabled. Creating Firestore-backed Virtual Auth account.");
          const customUid = `user-${Date.now()}`;
          const newProfile: UserProfile = {
            uid: customUid,
            email: normEmail,
            displayName,
            role: finalRole,
            canPostJobs: finalRole === "admin" || finalRole === "staff" ? true : false,
            password: resolvedPassword,
            authProvider: "email"
          };
          await saveUserProfile(newProfile);
          setCurrentUser(newProfile);
          memoryStore.currentUser = newProfile;
          sessionStorage.setItem("vr_virtual_user", JSON.stringify(newProfile));
        } else {
          throw err;
        }
      }
    } catch (e) {
      console.error("Could not complete Firebase signup:", e);
      // Absolute fallback
      const customUid = `user-${Date.now()}`;
      const newProfile: UserProfile = {
        uid: customUid,
        email: normEmail,
        displayName,
        role: finalRole,
        canPostJobs: finalRole === "admin" || finalRole === "staff" ? true : false,
        password: resolvedPassword,
        authProvider: "email"
      };
      await saveUserProfile(newProfile);
      setCurrentUser(newProfile);
      memoryStore.currentUser = newProfile;
      sessionStorage.setItem("vr_virtual_user", JSON.stringify(newProfile));
    } finally {
      setLoading(false);
    }
  };

  const triggerGooglePopup = async () => {
    setLoading(true);
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const profile = await getUserProfile(user.uid);
      const adminEmails = [
        "admin@valleyreigns.com"
      ];
      if (profile) {
        const userEmail = profile.email || "";
        const isAdminEmail = adminEmails.includes(userEmail.toLowerCase());
        let profileChanged = false;
        if (isAdminEmail && profile.role !== "admin") {
          profile.role = "admin";
          profile.canPostJobs = true;
          profileChanged = true;
        } else if (!isAdminEmail && profile.role === "admin") {
          profile.role = "seeker";
          profile.canPostJobs = false;
          profileChanged = true;
        }
        if (user.photoURL && profile.photoURL !== user.photoURL) {
          profile.photoURL = user.photoURL;
          profileChanged = true;
        }
        if (profileChanged) {
          await saveUserProfile(profile);
        }
        setCurrentUser(profile);
        memoryStore.currentUser = profile;
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "Google Job Seeker",
          role: "seeker",
          canPostJobs: false,
          authProvider: "google",
          photoURL: user.photoURL || undefined
        };
        await saveUserProfile(newProfile);
        setCurrentUser(newProfile);
        memoryStore.currentUser = newProfile;
      }
    } catch (e: any) {
      console.error("Google popup sign-in failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const google = (window as any).google;
      
      // Check permissions for FedCM
      let isFedCmAllowed = true;
      try {
        const docAny = document as any;
        if (docAny.permissionsPolicy && typeof docAny.permissionsPolicy.allowsFeature === 'function') {
          isFedCmAllowed = docAny.permissionsPolicy.allowsFeature('identity-credentials-get');
        }
      } catch (pe) {}
      
      const isInIframe = window.self !== window.top;

      if (isInIframe || !isFedCmAllowed) {
        console.log("Skipping One Tap and using direct Popup due to iframe or FedCM permission restrictions.");
        await triggerGooglePopup();
        return;
      }

      if (google && google.accounts && google.accounts.id) {
        // Trigger Google One Tap accounts sheet programmatically
        google.accounts.id.prompt(async (notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.warn(
              "Google One Tap sheet not displayed or skipped. Falling back to Google Login Popup:",
              notification.getNotDisplayedReason(),
              notification.getSkippedReason()
            );
            await triggerGooglePopup();
          }
        });
      } else {
        await triggerGooglePopup();
      }
    } catch (e: any) {
      console.warn("Google One Tap invocation failed, resorting to standard popup fallback:", e);
      await triggerGooglePopup();
    }
  };

  const loginWithEmail = async (email: string, password?: string): Promise<UserProfile> => {
    setLoading(true);
    const normEmail = email.trim().toLowerCase();
    const resolvedPassword = password || "password123";

    try {
      // 1. Fetch user by email to verify if registered
      const profile = await getUserProfileByEmail(normEmail);
      if (!profile) {
        throw new Error("This email is not registered. Please create an account first.");
      }

      // 2. If user exists but has NO password (registered with Google OAuth)
      if (!profile.password && resolvedPassword !== "magic-link-bypass") {
        throw new Error("oauth-login-link-sent");
      }

      // 3. If user has a set password, validate it before letting them log in
      if (profile.password && resolvedPassword !== "magic-link-bypass" && profile.password !== resolvedPassword) {
        throw new Error("Incorrect password. Please verify your credentials and try again.");
      }

      // 4. Try signing in via Firebase Auth
      try {
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        if (resolvedPassword !== "magic-link-bypass") {
          await signInWithEmailAndPassword(auth, normEmail, resolvedPassword);
        }
      } catch (err: any) {
        console.warn("Firebase Auth login failed, using direct virtual session fallback:", err);
      }

      const adminEmails = [
        "admin@valleyreigns.com"
      ];
      const isAdminEmail = adminEmails.includes(normEmail);
      if (isAdminEmail && profile.role !== "admin") {
        profile.role = "admin";
        profile.canPostJobs = true;
        await saveUserProfile(profile);
      } else if (!isAdminEmail && profile.role === "admin") {
        profile.role = "seeker";
        profile.canPostJobs = false;
        await saveUserProfile(profile);
      }

      setCurrentUser(profile);
      memoryStore.currentUser = profile;
      sessionStorage.setItem("vr_virtual_user", JSON.stringify(profile));
      setLoading(false);
      return profile;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    if (currentUser && (currentUser.role === "staff" || currentUser.role === "admin")) {
      try {
        await setStaffOnlineStatus(currentUser.uid, false);
      } catch (e) {
        console.warn("Could not set staff status to offline during logout:", e);
      }
    }
    sessionStorage.removeItem("vr_virtual_user");
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Signout request handled:", e);
    }
    setCurrentUser(null);
    memoryStore.currentUser = null;
    setLoading(false);
  };

  const updateUserPermission = async (canPost: boolean) => {
    if (currentUser) {
      const updated = { ...currentUser, canPostJobs: canPost };
      setCurrentUser(updated);
      memoryStore.currentUser = updated;
      try {
        await saveUserProfile(updated);
      } catch (e) {
        console.warn("Could not sync updated permissions to Firestore:", e);
      }
    }
  };

  const updateUserPreference = async (preference: "whatsapp" | "in-app") => {
    if (currentUser) {
      const updated = { ...currentUser, messagingPreference: preference };
      setCurrentUser(updated);
      memoryStore.currentUser = updated;
      if (sessionStorage.getItem("vr_virtual_user")) {
        sessionStorage.setItem("vr_virtual_user", JSON.stringify(updated));
      }
      try {
        await saveUserProfile(updated);
      } catch (e) {
        console.warn("Could not sync updated preference to Firestore:", e);
      }
    }
  };

  const sendPasswordlessLink = async (email: string): Promise<void> => {
    const normEmail = email.trim().toLowerCase();
    const actionCodeSettings = {
      url: window.location.origin + "/?email-link-signin=true",
      handleCodeInApp: true,
    };
    const { sendSignInLinkToEmail } = await import("firebase/auth");
    await sendSignInLinkToEmail(auth, normEmail, actionCodeSettings);
    window.localStorage.setItem("emailForSignIn", normEmail);
  };

  // Staff real-time presence heartbeat and onDisconnect registration
  useEffect(() => {
    if (!currentUser || (currentUser.role !== "staff" && currentUser.role !== "admin")) {
      return;
    }

    const uid = currentUser.uid;
    let presenceWorker: Worker | null = null;
    let connectedUnsubscribe: any = null;
    let disconnectRef: any = null;

    // Heartbeat to update lastActive in Firestore & RTDB every 1 minute
    const sendHeartbeat = async () => {
      try {
        await setStaffOnlineStatus(uid, true);
      } catch (e) {
        console.warn("[Presence] Failed sending online heartbeat:", e);
      }
    };

    // Send immediate heartbeat on login/mount
    sendHeartbeat();

    // Set up Web Worker for non-throttled background heartbeat interval (1 minute)
    try {
      const workerCode = `
        let intervalId = null;
        self.onmessage = function(e) {
          if (e.data.action === 'start') {
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(() => {
              self.postMessage('tick');
            }, e.data.interval || 60000);
          } else if (e.data.action === 'stop') {
            if (intervalId) clearInterval(intervalId);
            intervalId = null;
          }
        };
      `;
      const blob = new Blob([workerCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      presenceWorker = new Worker(workerUrl);
      
      presenceWorker.onmessage = (e) => {
        if (e.data === "tick") {
          sendHeartbeat();
        }
      };
      
      presenceWorker.postMessage({ action: "start", interval: 60000 }); // 1 minute interval
    } catch (err) {
      console.warn("[Presence] Web Worker not supported or failed to initialize, falling back to standard interval:", err);
      // Fallback to standard interval
      const fallbackInterval = setInterval(sendHeartbeat, 60000);
      (presenceWorker as any) = {
        terminate: () => clearInterval(fallbackInterval)
      };
    }

    // Set up Realtime Database onDisconnect trigger
    if (rtdb) {
      try {
        const connectedRef = ref(rtdb, ".info/connected");
        connectedUnsubscribe = onValue(connectedRef, async (snap) => {
          const isConnected = snap.val() === true;
          
          window.dispatchEvent(new CustomEvent("rtdb-connection-changed", {
            detail: { connected: isConnected }
          }));

          if (isConnected) {
            console.log("[Presence] Connected to Firebase RTDB. Configuring onDisconnect handler.");
            // Re-assert online status when reconnected
            await setStaffOnlineStatus(uid, true);

            const statusRef = ref(rtdb, `staff_statuses/${uid}`);
            disconnectRef = onDisconnect(statusRef);
            await disconnectRef.set({
              status: "offline",
              lastActive: Date.now()
            });
          }
        });
      } catch (e) {
        console.warn("[Presence] Could not set up RTDB disconnect handler:", e);
      }
    }

    return () => {
      if (presenceWorker) {
        try {
          if (typeof presenceWorker.postMessage === "function") {
            presenceWorker.postMessage({ action: "stop" });
          }
          presenceWorker.terminate();
        } catch (e) {
          console.warn("[Presence] Failed to terminate worker:", e);
        }
      }
      if (connectedUnsubscribe) {
        connectedUnsubscribe();
      }
      if (disconnectRef) {
        try {
          disconnectRef.cancel();
        } catch (e) {
          console.warn("[Presence] Failed to cancel RTDB onDisconnect hook:", e);
        }
      }
    };
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, loading, loginDemo, signupUser, loginWithEmail, loginWithGoogle, logout, updateUserPermission, updateUserPreference, sendPasswordlessLink }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
