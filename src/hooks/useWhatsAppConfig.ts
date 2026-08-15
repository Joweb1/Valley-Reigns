import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface WhatsAppConfigState {
  connectedPhone: string | null;
  formattedPhone: string | null;
  cleanedPhone: string | null;
  providerMode: "baileys" | "official";
  baileysStatus: string;
  isConnected: boolean;
  getWhatsAppLink: (messageText: string) => string;
}

export function useWhatsAppConfig(): WhatsAppConfigState {
  const [providerMode, setProviderMode] = useState<"baileys" | "official">("baileys");
  const [baileysUserPhone, setBaileysUserPhone] = useState<string | null>(null);
  const [officialPhoneNumber, setOfficialPhoneNumber] = useState<string | null>(null);
  const [baileysStatus, setBaileysStatus] = useState<string>("disconnected");

  // 1. Listen to Firestore settings/whatsapp doc
  useEffect(() => {
    try {
      const configRef = doc(db, "settings", "whatsapp");
      const unsubscribe = onSnapshot(configRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.mode) setProviderMode(data.mode);
          if (data.baileysUserPhone) setBaileysUserPhone(data.baileysUserPhone);
          if (data.officialPhoneNumber) setOfficialPhoneNumber(data.officialPhoneNumber);
          if (typeof data.baileysConnected === "boolean") {
            setBaileysStatus(data.baileysConnected ? "connected" : "disconnected");
          }
        }
      }, (err) => {
        console.warn("useWhatsAppConfig: Firestore listener warning", err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("useWhatsAppConfig: Setup snapshot error", e);
    }
  }, []);

  // 2. Poll server /api/whatsapp/provider-status to get real-time memory state of Baileys socket
  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/whatsapp/provider-status");
        if (res.ok && mounted) {
          const data = await res.json();
          if (data.activeMode) setProviderMode(data.activeMode);
          if (data.baileysUserPhone) setBaileysUserPhone(data.baileysUserPhone);
          if (data.baileysStatus) setBaileysStatus(data.baileysStatus);
          if (data.officialConfig?.officialPhoneNumber) {
            setOfficialPhoneNumber(data.officialConfig.officialPhoneNumber);
          }
        }
      } catch (err) {
        // Silent catch for background polling
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Select active phone based on active mode
  let rawPhone: string | null = null;
  if (providerMode === "baileys") {
    rawPhone = baileysUserPhone || officialPhoneNumber;
  } else {
    rawPhone = officialPhoneNumber || baileysUserPhone;
  }

  // Extract digits for wa.me URL
  const cleanedPhone = rawPhone ? rawPhone.replace(/[^0-9]/g, "") : null;
  const formattedPhone = rawPhone ? (rawPhone.startsWith("+") ? rawPhone : `+${cleanedPhone}`) : null;
  const isConnected = providerMode === "baileys" ? (baileysStatus === "connected" || Boolean(cleanedPhone)) : Boolean(cleanedPhone);

  const getWhatsAppLink = (messageText: string): string => {
    const encodedMsg = encodeURIComponent(messageText);
    if (cleanedPhone && cleanedPhone.length >= 7) {
      return `https://wa.me/${cleanedPhone}?text=${encodedMsg}`;
    }
    return `https://wa.me/?text=${encodedMsg}`;
  };

  return {
    connectedPhone: rawPhone,
    formattedPhone,
    cleanedPhone,
    providerMode,
    baileysStatus,
    isConnected,
    getWhatsAppLink
  };
}
