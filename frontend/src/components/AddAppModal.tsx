import React, { useState } from "react";
import { X, Plus, Github, ExternalLink, Tag, Type, AlignLeft, Sparkles, Image as ImageIcon, Upload } from "lucide-react";
import api from "../services/api";
import AppGlyph from "../os/AppGlyph";
import { fileToIconDataUrl } from "./iconUpload";

interface AddAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppAdded: () => void;
}

const AddAppModal: React.FC<AddAppModalProps> = ({ isOpen, onClose, onAppAdded }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    github_url: "",
    category: "",
    icon: "",
    is_live: true,
    embeddable: false,
    proxy_embed: false,
    embed_url: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      await api.post("apps/", formData, {
        headers: { Authorization: "Bearer " + token }
      });
      onAppAdded();
      onClose();
      setFormData({ name: "", description: "", url: "", github_url: "", category: "", icon: "", is_live: true, embeddable: false, proxy_embed: false, embed_url: "" });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to add application.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onPickIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { const url = await fileToIconDataUrl(f); setFormData(prev => ({ ...prev, icon: url })); } catch { /* ignore */ }
  };

  const getInputStyle = (fieldName: string): React.CSSProperties => ({
    width: "100%",
    background: focusedField === fieldName ? "rgba(124, 58, 237, 0.15)" : "rgba(45, 50, 70, 0.9)",
    border: focusedField === fieldName ? "1.5px solid rgba(168, 85, 247, 0.7)" : "1px solid rgba(148, 163, 184, 0.3)",
    borderRadius: "10px",
    padding: "9px 12px",
    color: "#f1f5f9",
    fontSize: "0.88rem",
    outline: "none",
    transition: "all 0.15s ease",
    boxShadow: focusedField === fieldName ? "0 0 16px rgba(168, 85, 247, 0.18)" : "none",
  });

  const labelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "0.68rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#c4b5fd",
    marginBottom: "5px",
  };

  const checkbox = (name: "embeddable" | "proxy_embed", title: string, sub: string) => (
    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
      <input
        name={name}
        type="checkbox"
        checked={formData[name]}
        onChange={(e) => setFormData(prev => ({ ...prev, [name]: e.target.checked }))}
        style={{ width: "16px", height: "16px", marginTop: "2px", accentColor: "#a855f7", cursor: "pointer", flexShrink: 0 }}
      />
      <span style={{ fontSize: "0.82rem", color: "#e2e8f0", lineHeight: 1.35 }}>
        {title}
        <span style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8", marginTop: "1px" }}>{sub}</span>
      </span>
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(8, 10, 20, 0.34)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="w-full relative overflow-hidden"
        style={{
          maxWidth: "600px",
          maxHeight: "94vh",
          overflowY: "auto",
          background: "linear-gradient(165deg, #1e1b4b 0%, #0f172a 50%, #0c0a1d 100%)",
          borderRadius: "20px",
          border: "1px solid rgba(168, 85, 247, 0.3)",
          boxShadow: "0 25px 80px rgba(0, 0, 0, 0.7), 0 0 60px rgba(168, 85, 247, 0.15)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          position: "absolute", top: "-100px", right: "-100px", width: "220px", height: "220px",
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ padding: "18px 26px 14px", borderBottom: "1px solid rgba(148, 163, 184, 0.15)", position: "relative" }}>
          <button onClick={onClose} style={{
            position: "absolute", top: "16px", right: "16px", width: "32px", height: "32px",
            borderRadius: "9px", border: "1px solid rgba(148, 163, 184, 0.3)", background: "rgba(30, 35, 50, 0.8)",
            color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <X size={17} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "46px", height: "46px", borderRadius: "14px",
              background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(124, 58, 237, 0.4)", flexShrink: 0,
            }}>
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f8fafc", margin: 0 }}>Add New Application</h2>
              <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "2px 0 0 0" }}>Connect a new service to the ecosystem</p>
            </div>
          </div>
        </div>

        <div style={{ padding: "18px 26px 22px", position: "relative" }}>
          {error && <div style={{ marginBottom: "14px", padding: "11px 14px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", fontSize: "0.85rem" }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={labelStyle}><Type size={13} /> App Name</label>
                <input name="name" type="text" required placeholder="AI Agent Pro" value={formData.name} onChange={handleChange} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} style={getInputStyle("name")} />
              </div>
              <div>
                <label style={labelStyle}><Tag size={13} /> Category</label>
                <input name="category" type="text" required placeholder="AI Security" value={formData.category} onChange={handleChange} onFocus={() => setFocusedField("category")} onBlur={() => setFocusedField(null)} style={getInputStyle("category")} />
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}><AlignLeft size={13} /> Description</label>
              <textarea name="description" rows={2} required placeholder="What does this application do?" value={formData.description} onChange={handleChange} onFocus={() => setFocusedField("description")} onBlur={() => setFocusedField(null)} style={{ ...getInputStyle("description"), resize: "none", fontFamily: "inherit" }} />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}><ImageIcon size={13} /> Icon</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div className="app-icon-prev" style={{ width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(148,163,184,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <AppGlyph app={{ name: formData.name, icon: formData.icon }} size={28} />
                </div>
                {formData.icon.startsWith("data:") ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: "10px", background: "rgba(45,50,70,0.9)", border: "1px solid rgba(148,163,184,0.3)", color: "#cbd5e1", fontSize: "0.85rem" }}>
                    <ImageIcon size={15} /> Uploaded image
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, icon: "" }))} style={{ marginLeft: "auto", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.8rem" }}>Clear</button>
                  </div>
                ) : (
                  <input name="icon" type="text" placeholder="URL, /logos/x.png, emoji, or lucide:Name" value={formData.icon} onChange={handleChange} onFocus={() => setFocusedField("icon")} onBlur={() => setFocusedField(null)} style={{ ...getInputStyle("icon"), flex: 1 }} />
                )}
                <label style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: "10px", border: "1px solid rgba(168,85,247,0.5)", background: "rgba(124,58,237,0.15)", color: "#e9d5ff", fontSize: "0.83rem", fontWeight: 600, cursor: "pointer" }}>
                  <Upload size={15} /> Upload
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={onPickIcon} />
                </label>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}><ExternalLink size={13} /> Live URL</label>
                <input name="url" type="url" required placeholder="https://app.example.com" value={formData.url} onChange={handleChange} onFocus={() => setFocusedField("url")} onBlur={() => setFocusedField(null)} style={getInputStyle("url")} />
              </div>
              <div>
                <label style={labelStyle}><Github size={13} /> GitHub Repo</label>
                <input name="github_url" type="url" required placeholder="https://github.com/org/repo" value={formData.github_url} onChange={handleChange} onFocus={() => setFocusedField("github_url")} onBlur={() => setFocusedField(null)} style={getInputStyle("github_url")} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
              {checkbox("embeddable", "Open in a window", "Leave off if the app blocks iframes — opens in its own tab.")}
              {checkbox("proxy_embed", "Same-origin proxy", "For apps that block framing but tolerate a path prefix. SPAs embed directly.")}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}><ExternalLink size={13} /> Embed URL (optional)</label>
              <input name="embed_url" type="url" placeholder="Token-bearing URL to frame instead of the app URL" value={formData.embed_url} onChange={handleChange} onFocus={() => setFocusedField("embed_url")} onBlur={() => setFocusedField(null)} style={getInputStyle("embed_url")} />
              <span style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8", marginTop: "5px" }}>
                Stored encrypted; framed instead of the app URL when set (e.g. an OpenClaw tokenized dashboard URL).
              </span>
            </div>

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "13px 24px", borderRadius: "12px", border: "none",
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)",
              color: "#ffffff", fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
              boxShadow: "0 8px 32px rgba(168, 85, 247, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            }}>
              <Plus size={19} />
              {loading ? "Deploying..." : "Deploy to Hub"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAppModal;
