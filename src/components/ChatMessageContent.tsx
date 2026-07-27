import React, { useState } from "react";
import { ChatMessage } from "../types";
import { FileText, Download, ExternalLink, Image as ImageIcon, Eye, X, FileCheck } from "lucide-react";

interface ChatMessageContentProps {
  msg: ChatMessage;
  isSelf: boolean;
}

interface ParsedAttachment {
  url: string;
  type: "image" | "pdf" | "file";
  name?: string;
}

export const ChatMessageContent: React.FC<ChatMessageContentProps> = ({ msg, isSelf }) => {
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);

  // Extract attachments from msg.attachmentUrl or parse msg.text
  const parseMessage = () => {
    const text = msg.text || "";
    const attachments: ParsedAttachment[] = [];
    let cleanText = text;

    // 1. Explicit ChatMessage attachment field
    if (msg.attachmentUrl) {
      attachments.push({
        url: msg.attachmentUrl,
        type: msg.attachmentType || (isImageUrl(msg.attachmentUrl) ? "image" : isPdfUrl(msg.attachmentUrl) ? "pdf" : "file"),
        name: msg.attachmentName
      });
    }

    // 2. Parse structured attachment notices in text
    // Format: [Attached Image]: https://... OR [Attached Photo]: https://...
    const imageNoticeRegex = /\[Attached (?:Image|Photo)\]:\s*(https?:\/\/[^\s]+)/gi;
    let match;
    while ((match = imageNoticeRegex.exec(text)) !== null) {
      if (!attachments.some(a => a.url === match[1])) {
        attachments.push({
          url: match[1],
          type: "image"
        });
      }
      cleanText = cleanText.replace(match[0], "").trim();
    }

    // Format: [Attached (?:Document/File|CV/Document)]: name\nhttps://... or [Attached (?:Document/File|CV/Document)]: https://...
    const docNoticeRegex = /\[Attached (?:Document\/File|CV\/Document)\]:\s*(.*?)(?:\r?\n|\s)+(https?:\/\/[^\s]+)/gi;
    while ((match = docNoticeRegex.exec(text)) !== null) {
      const docName = match[1]?.trim() || "Attached Document";
      const docUrl = match[2]?.trim();
      if (docUrl && !attachments.some(a => a.url === docUrl)) {
        attachments.push({
          url: docUrl,
          type: isPdfUrl(docUrl) ? "pdf" : "file",
          name: docName
        });
      }
      cleanText = cleanText.replace(match[0], "").trim();
    }

    // 3. Fallback: Parse standalone URLs in cleanText if they are ImageKit/Image/PDF links
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urlsInText = cleanText.match(urlRegex) || [];
    urlsInText.forEach(url => {
      if (!attachments.some(a => a.url === url)) {
        if (isImageUrl(url)) {
          attachments.push({ url, type: "image" });
          // If the message is JUST the url, clear cleanText
          if (cleanText.trim() === url) cleanText = "";
        } else if (isPdfUrl(url) || isDocUrl(url)) {
          attachments.push({ url, type: isPdfUrl(url) ? "pdf" : "file" });
          if (cleanText.trim() === url) cleanText = "";
        }
      }
    });

    return { cleanText, attachments };
  };

  const isImageUrl = (url: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.includes("ik.imagekit.io") ||
      /\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(lower) ||
      lower.includes("images.unsplash.com")
    );
  };

  const isPdfUrl = (url: string) => {
    if (!url) return false;
    return /\.pdf(\?.*)?$/i.test(url.toLowerCase()) || url.toLowerCase().includes("format=pdf");
  };

  const isDocUrl = (url: string) => {
    if (!url) return false;
    return /\.(doc|docx|txt|xls|xlsx|ppt|pptx)(\?.*)?$/i.test(url.toLowerCase());
  };

  const { cleanText, attachments } = parseMessage();

  return (
    <div className="space-y-2.5">
      {/* Clean text paragraph if non-empty */}
      {cleanText && (
        <p className="text-xs leading-relaxed whitespace-pre-line break-words">
          {cleanText}
        </p>
      )}

      {/* Attachments & Previews */}
      {attachments.length > 0 && (
        <div className="space-y-2 mt-1.5">
          {attachments.map((att, idx) => {
            if (att.type === "image") {
              return (
                <div key={idx} className="relative group overflow-hidden rounded-xl border border-black/10 shadow-sm bg-black/5">
                  <img
                    src={att.url}
                    alt={att.name || "Chat Attachment"}
                    className="max-h-60 w-full object-cover rounded-xl cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onClick={() => setActiveImageModal(att.url)}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                    <button
                      type="button"
                      onClick={() => setActiveImageModal(att.url)}
                      className="px-2.5 py-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-[10px] font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Preview Image</span>
                    </button>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open</span>
                    </a>
                  </div>
                </div>
              );
            }

            // PDF or Document Card Preview
            const isPdf = att.type === "pdf";
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-left transition-all ${
                  isSelf
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-slate-50 border-slate-200/90 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    isPdf ? "bg-rose-500/15 text-rose-600" : "bg-blue-500/15 text-blue-600"
                  }`}>
                    {isPdf ? <FileText className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">
                      {att.name || (isPdf ? "Attached Resume / Document (PDF)" : "Attached Document")}
                    </p>
                    <span className={`text-[10px] font-mono ${isSelf ? "text-white/70" : "text-slate-400"}`}>
                      {isPdf ? "PDF Document • ImageKit CDN" : "Document File • ImageKit CDN"}
                    </span>
                  </div>
                </div>

                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    isSelf
                      ? "bg-white text-slate-900 hover:bg-slate-100 shadow-2xs"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>View File</span>
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Image Preview Lightbox */}
      {activeImageModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setActiveImageModal(null)}
              className="absolute -top-10 right-0 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activeImageModal}
              alt="Enlarged Attachment"
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div className="mt-3 flex gap-3">
              <a
                href={activeImageModal}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 hover:bg-blue-700 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Original Image</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
