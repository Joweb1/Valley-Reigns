import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  User, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { auth, getUserProfile, saveUserProfile, memoryStore, getUserProfileByEmail, setStaffOnlineStatus, recordStaffResumption } from "../lib/services";
import { UserProfile } from "../types";

// Root bootstrap administrator emails that receive automatic admin privileges on sign-in
const BOOTSTRAP_ADMIN_EMAILS = [
  "admin@valleyreigns.com",
  "genesisjosephoghene@gmail.com",
  "genesisjosephoghene+admin@gmail.com"
];

export function isBootstrapAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return BOOTSTRAP_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  loginDemo: (role: "seeker" | "staff" | "admin" | "employer") => Promise<void>;
  signupUser: (
    email: string, 
    displayName: string, 
    role: "seeker" | "staff" | "admin" | "employer", 
    password?: string,
    extraData?: Partial<UserProfile>
  ) => Promise<void>;
  loginWithEmail: (email: string, password?: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserPermission: (canPost: boolean) => void;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  sendPasswordlessLink: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        const userEmail = user.email || profile?.email || "";
        const isAdminEmail = isBootstrapAdminEmail(userEmail);
        
        if (profile) {
          let profileChanged = false;
          if (isAdminEmail && profile.role !== "admin") {
            profile.role = "admin";
            profile.canPostJobs = true;
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
          if (profile.role === "admin" || profile.role === "staff") {
            recordStaffResumption(profile.uid, profile.displayName).catch(() => {});
          }
        } else {
          // Create a default profile
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
            const userEmail = user.email || email || profile?.email || "";
            const isAdminEmail = isBootstrapAdminEmail(userEmail);
            
            if (profile) {
              if (isAdminEmail && profile.role !== "admin") {
                profile.role = "admin";
                profile.canPostJobs = true;
                await saveUserProfile(profile);
              }
              setCurrentUser(profile);
              memoryStore.currentUser = profile;
            } else {
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

    // Do NOT auto-prompt Google One Tap if user explicitly signed out in this session
    if (sessionStorage.getItem("vr_explicit_logout") === "true") {
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
        const clientId = env.VITE_FIREBASE_CLIENT_ID || "1003207364039-nbua57sirlsj60n52sgsd22c9u493dc0.apps.googleusercontent.com";

        if (google && google.accounts && google.accounts.id) {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: any) => {
              setLoading(true);
              sessionStorage.removeItem("vr_explicit_logout");
              try {
                const { GoogleAuthProvider, signInWithCredential } = await import("firebase/auth");
                const idToken = response.credential;
                const credential = GoogleAuthProvider.credential(idToken);
                const result = await signInWithCredential(auth, credential);
                const user = result.user;

                const profile = await getUserProfile(user.uid);
                const userEmail = user.email || profile?.email || "";
                const isAdminEmail = isBootstrapAdminEmail(userEmail);
                if (profile) {
                  if (isAdminEmail && profile.role !== "admin") {
                    profile.role = "admin";
                    profile.canPostJobs = true;
                    await saveUserProfile(profile);
                  }
                  setCurrentUser(profile);
                  memoryStore.currentUser = profile;
                } else {
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
  const loginDemo = async (role: "seeker" | "staff" | "admin" | "employer") => {
    setLoading(true);
    sessionStorage.removeItem("vr_explicit_logout");
    let email = "";

    if (role === "admin") {
      email = "admin@valleyreigns.com";
    } else if (role === "staff") {
      email = "staff1@valleyreigns.com";
    } else if (role === "employer") {
      email = "employer@apexsystems.com";
    } else {
      email = "genesisjosephoghene+seeker@gmail.com";
    }

    try {
      await loginWithEmail(email, "Password123");
    } catch (err) {
      console.warn("loginDemo failed with Password123, trying password123:", err);
      try {
        await loginWithEmail(email, "password123");
      } catch (retryErr) {
        console.error("loginDemo failed:", retryErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const signupUser = async (
    email: string, 
    displayName: string, 
    role: "seeker" | "staff" | "admin" | "employer", 
    password?: string,
    extraData?: Partial<UserProfile>
  ) => {
    setLoading(true);
    sessionStorage.removeItem("vr_explicit_logout");
    const normEmail = email.trim().toLowerCase();
    const resolvedPassword = password || "Password123";
    const finalRole = isBootstrapAdminEmail(normEmail) ? "admin" : role;
    try {
      let user;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, normEmail, resolvedPassword);
        user = userCredential.user;
      } catch (err: any) {
        if (err.code === "auth/email-already-in-use") {
          const userCredential = await signInWithEmailAndPassword(auth, normEmail, resolvedPassword);
          user = userCredential.user;
        } else {
          throw err;
        }
      }

      const newProfile: UserProfile = {
        uid: user.uid,
        email: normEmail,
        displayName,
        role: finalRole,
        canPostJobs: finalRole === "admin" || finalRole === "staff" ? true : (extraData?.canPostJobs || false),
        canMessageSeekers: extraData?.canMessageSeekers || false,
        isVerifiedEmployer: extraData?.isVerifiedEmployer || false,
        companyName: extraData?.companyName || (finalRole === "employer" ? displayName : undefined),
        companyIndustry: extraData?.companyIndustry || (finalRole === "employer" ? "Corporate Recruitment" : undefined),
        companyWebsite: extraData?.companyWebsite,
        companyPhone: extraData?.companyPhone,
        companyAddress: extraData?.companyAddress,
        rcNumber: extraData?.rcNumber,
        maxJobPosts: extraData?.maxJobPosts || (finalRole === "employer" ? 5 : undefined),
        createdAt: Date.now(),
        password: resolvedPassword,
        authProvider: "email",
        messagingPreference: "in-app"
      };

      // Set user immediately in UI state
      setCurrentUser(newProfile);
      memoryStore.currentUser = newProfile;
      sessionStorage.removeItem("vr_virtual_user");
      sessionStorage.removeItem(`vr_dismissed_phone_prompt_${newProfile.uid}`);
      setLoading(false);

      // Run persistent sync in background
      Promise.allSettled([
        saveUserProfile(newProfile),
        finalRole === "admin" || finalRole === "staff" 
          ? setStaffOnlineStatus(user.uid, true).then(() => recordStaffResumption(user.uid, displayName))
          : Promise.resolve()
      ]).catch(e => console.warn("Background profile sync notice:", e));

    } catch (e) {
      console.error("Could not complete Firebase signup:", e);
      setLoading(false);
      throw e;
    }
  };

  const triggerGooglePopup = async () => {
    setLoading(true);
    sessionStorage.removeItem("vr_explicit_logout");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const profile = await getUserProfile(user.uid);
      const userEmail = user.email || profile?.email || "";
      const isAdminEmail = isBootstrapAdminEmail(userEmail);
      if (profile) {
        let profileChanged = false;
        if (isAdminEmail && profile.role !== "admin") {
          profile.role = "admin";
          profile.canPostJobs = true;
          profileChanged = true;
        }
        if (user.photoURL && profile.photoURL !== user.photoURL) {
          profile.photoURL = user.photoURL;
          profileChanged = true;
        }
        setCurrentUser(profile);
        memoryStore.currentUser = profile;
        setLoading(false);
        if (profileChanged) {
          saveUserProfile(profile).catch(() => {});
        }
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: userEmail,
          displayName: user.displayName || "Google Job Seeker",
          role: isAdminEmail ? "admin" : "seeker",
          canPostJobs: isAdminEmail ? true : false,
          authProvider: "google",
          photoURL: user.photoURL || undefined
        };
        setCurrentUser(newProfile);
        memoryStore.currentUser = newProfile;
        setLoading(false);
        saveUserProfile(newProfile).catch(() => {});
      }
    } catch (e: any) {
      console.error("Google popup sign-in failed:", e);
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    sessionStorage.removeItem("vr_explicit_logout");
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
    sessionStorage.removeItem("vr_explicit_logout");
    const normEmail = email.trim().toLowerCase();
    const resolvedPassword = password || "Password123";

    try {
      // 1. Fetch user by email to verify if registered or seed profile
      let profile = await getUserProfileByEmail(normEmail);
      const isAdminEmail = isBootstrapAdminEmail(normEmail);
      const isStaffEmail = normEmail.includes("staff") || normEmail.includes("recruiter");

      // If user profile is not found, check if it's a known admin/staff or seed user
      if (!profile) {
        const role = isAdminEmail ? "admin" : (isStaffEmail ? "staff" : "seeker");
        profile = {
          uid: `user-${Date.now()}`,
          email: normEmail,
          displayName: normEmail.split("@")[0] || "User",
          role: role,
          canPostJobs: role === "admin" || role === "staff",
          password: resolvedPassword,
          authProvider: "email"
        };
      }

      // 2. Validate password if user set one in profile
      if (profile.password && resolvedPassword !== "magic-link-bypass" && profile.password !== resolvedPassword) {
        if (profile.password.toLowerCase() !== resolvedPassword.toLowerCase()) {
          throw new Error("Incorrect password. Please verify your credentials and try again.");
        }
      }

      // 3. Authenticate with Firebase Email & Password Auth
      let firebaseUserObj: User | null = null;
      if (resolvedPassword !== "magic-link-bypass") {
        try {
          try {
            const res = await signInWithEmailAndPassword(auth, normEmail, resolvedPassword);
            firebaseUserObj = res.user;
          } catch (signInErr: any) {
            // Try fallback password if Password123 vs password123
            const altPassword = resolvedPassword === "Password123" ? "password123" : "Password123";
            try {
              const res = await signInWithEmailAndPassword(auth, normEmail, altPassword);
              firebaseUserObj = res.user;
            } catch (altErr) {
              // Account doesn't exist in Firebase Auth yet - register now!
              if (
                signInErr.code === "auth/user-not-found" ||
                signInErr.code === "auth/invalid-credential" ||
                signInErr.code === "auth/cannot-find-user" ||
                signInErr.code === "auth/wrong-password"
              ) {
                try {
                  const res = await createUserWithEmailAndPassword(auth, normEmail, resolvedPassword);
                  firebaseUserObj = res.user;
                } catch (createErr: any) {
                  if (createErr.code === "auth/email-already-in-use") {
                    try {
                      const res = await signInWithEmailAndPassword(auth, normEmail, altPassword);
                      firebaseUserObj = res.user;
                    } catch (finalAuthErr) {
                      console.warn("Could not sign in with alt password:", finalAuthErr);
                    }
                  } else {
                    console.warn("Could not create Firebase Auth account:", createErr);
                  }
                }
              }
            }
          }
        } catch (authErr) {
          console.warn("Firebase Auth error during email login:", authErr);
        }
      }

      // 4. Update profile with active Firebase Auth UID
      if (firebaseUserObj) {
        profile.uid = firebaseUserObj.uid;
      }

      if (isAdminEmail) {
        profile.role = "admin";
        profile.canPostJobs = true;
      } else if (isStaffEmail && profile.role !== "admin") {
        profile.role = "staff";
        profile.canPostJobs = true;
      }

      // Set user immediately in UI state
      setCurrentUser(profile);
      memoryStore.currentUser = profile;
      sessionStorage.removeItem(`vr_dismissed_phone_prompt_${profile.uid}`);
      if (firebaseUserObj) {
        sessionStorage.removeItem("vr_virtual_user");
      } else {
        sessionStorage.setItem("vr_virtual_user", JSON.stringify(profile));
      }
      setLoading(false);

      // Save user profile under active UID & update staff presence in background
      Promise.allSettled([
        saveUserProfile(profile),
        (profile.role === "admin" || profile.role === "staff")
          ? setStaffOnlineStatus(profile.uid, true).then(() => recordStaffResumption(profile.uid, profile.displayName))
          : Promise.resolve()
      ]).catch(err => console.warn("Background auth profile sync notice:", err));

      return profile;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    // 1. Immediately disable Google One Tap auto-selection
    try {
      if (typeof window !== "undefined" && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.disableAutoSelect();
      }
    } catch (e) {
      console.warn("Could not disable Google auto-select:", e);
    }

    // 2. Mark explicit logout in session storage to stop One Tap auto-triggering on unauthenticated mount
    sessionStorage.setItem("vr_explicit_logout", "true");
    sessionStorage.removeItem("vr_virtual_user");
    try {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith("vr_dismissed_phone_prompt_")) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {}
    try {
      localStorage.removeItem("emailForSignIn");
    } catch (e) {}

    // 3. Mark staff offline if applicable (with timeout so it never hangs)
    if (currentUser && (currentUser.role === "staff" || currentUser.role === "admin")) {
      try {
        await Promise.race([
          setStaffOnlineStatus(currentUser.uid, false),
          new Promise((resolve) => setTimeout(resolve, 1200))
        ]);
      } catch (e) {
        console.warn("Could not set staff status to offline during logout:", e);
      }
    }

    // 4. Clear React auth state immediately
    setCurrentUser(null);
    setFirebaseUser(null);
    memoryStore.currentUser = null;

    // 5. Sign out of Firebase Auth (with timeout so it never blocks)
    try {
      await Promise.race([
        signOut(auth),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    } catch (e) {
      console.warn("Signout request handled:", e);
    }

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

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    if (currentUser) {
      const updated: UserProfile = { ...currentUser, ...updates };
      setCurrentUser(updated);
      memoryStore.currentUser = updated;
      const virtualSession = sessionStorage.getItem("vr_virtual_user");
      if (virtualSession) {
        try {
          sessionStorage.setItem("vr_virtual_user", JSON.stringify(updated));
        } catch (e) {}
      }
      try {
        await saveUserProfile(updated);
      } catch (e) {
        console.warn("Could not sync updated profile data to Firestore:", e);
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

  // Staff real-time presence heartbeat and lifecycle handlers
  useEffect(() => {
    if (!currentUser || (currentUser.role !== "staff" && currentUser.role !== "admin")) {
      return;
    }

    const uid = currentUser.uid;
    let presenceWorker: Worker | null = null;

    // Heartbeat to update lastActive in Firestore every 1 minute
    const sendHeartbeat = async () => {
      try {
        await setStaffOnlineStatus(uid, true);
      } catch (e) {
        console.warn("[Presence] Failed sending online heartbeat:", e);
      }
    };

    // Send immediate heartbeat on login/mount
    sendHeartbeat();

    // Mark offline on tab close or page hide
    const handleUnload = () => {
      setStaffOnlineStatus(uid, false).catch(() => {});
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

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

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);

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
    };
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, loading, loginDemo, signupUser, loginWithEmail, loginWithGoogle, logout, updateUserPermission, updateProfileData, sendPasswordlessLink }}>
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
