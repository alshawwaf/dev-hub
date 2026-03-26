import React, { useState } from "react";
import { X, Plus, Github, ExternalLink, Tag, Type, AlignLeft, Sparkles } from "lucide-react";
import api from "../services/api";

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
    icon: "app",
    is_live: true
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
      setFormData({ name: "", description: "", url: "", github_url: "", category: "", icon: "app", is_live: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to add application.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const getInputStyle = (fieldName: string): React.CSSProperties => ({
    width: "100%",
    background: focusedField === fieldName ? "rgba(124, 58, 237, 0.15)" : "rgba(45, 50, 70, 0.9)",
    border: focusedField === fieldName ? "2px solid rgba(168, 85, 247, 0.7)" : "1px solid rgba(148, 163, 184, 0.3)",
    borderRadius: "12px",
    padding: "16px 18px",
    color: "#f1f5f9",
    fontSize: "0.95rem",
    outline: "none",
    transition: "all 0.2s ease",
    boxShadow: focusedField === fieldName ? "0 0 20px rgba(168, 85, 247, 0.2)" : "none",
  });

  const labelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#c4b5fd",
    marginBottom: "10px",
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md relative overflow-hidden"
        style={{ 
          background: "linear-gradient(165deg, #1e1b4b 0%, #0f172a 50%, #0c0a1d 100%)",
          borderRadius: "24px",
          border: "1px solid rgba(168, 85, 247, 0.3)",
          boxShadow: "0 25px 80px rgba(0, 0, 0, 0.7), 0 0 60px rgba(168, 85, 247, 0.15)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          position: "absolute", top: "-100px", right: "-100px", width: "250px", height: "250px",
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ padding: "28px 32px 24px", borderBottom: "1px solid rgba(148, 163, 184, 0.15)", position: "relative" }}>
          <button onClick={onClose} style={{
            position: "absolute", top: "20px", right: "20px", width: "36px", height: "36px",
            borderRadius: "10px", border: "1px solid rgba(148, 163, 184, 0.3)", background: "rgba(30, 35, 50, 0.8)",
            color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <X size={18} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "16px",
              background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(124, 58, 237, 0.4)",
            }}>
              <Sparkles size={26} className="text-white" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f8fafc", margin: 0 }}>Add New Application</h2>
              <p style={{ fontSize: "0.875rem", color: "#94a3b8", margin: "4px 0 0 0" }}>Connect a new service to the ecosystem</p>
            </div>
          </div>
        </div>

        <div style={{ padding: "28px 32px 32px", position: "relative" }}>
          {error && <div style={{ marginBottom: "20px", padding: "14px 16px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", fontSize: "0.875rem" }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={labelStyle}><Type size={14} /> App Name</label>
                <input name="name" type="text" required placeholder="AI Agent Pro" value={formData.name} onChange={handleChange} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} style={getInputStyle("name")} />
              </div>
              <div>
                <label style={labelStyle}><Tag size={14} /> Category</label>
                <input name="category" type="text" required placeholder="AI Security" value={formData.category} onChange={handleChange} onFocus={() => setFocusedField("category")} onBlur={() => setFocusedField(null)} style={getInputStyle("category")} />
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}><AlignLeft size={14} /> Description</label>
              <textarea name="description" rows={3} required placeholder="What does this application do?" value={formData.description} onChange={handleChange} onFocus={() => setFocusedField("description")} onBlur={() => setFocusedField(null)} style={{ ...getInputStyle("description"), resize: "none", fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}>
              <div>
                <label style={labelStyle}><ExternalLink size={14} /> Live URL</label>
                <input name="url" type="url" required placeholder="https://app.example.com" value={formData.url} onChange={handleChange} onFocus={() => setFocusedField("url")} onBlur={() => setFocusedField(null)} style={getInputStyle("url")} />
              </div>
              <div>
                <label style={labelStyle}><Github size={14} /> GitHub Repo</label>
                <input name="github_url" type="url" required placeholder="https://github.com/org/repo" value={formData.github_url} onChange={handleChange} onFocus={() => setFocusedField("github_url")} onBlur={() => setFocusedField(null)} style={getInputStyle("github_url")} />
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "18px 24px", borderRadius: "14px", border: "none",
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)",
              color: "#ffffff", fontSize: "0.95rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
              boxShadow: "0 8px 32px rgba(168, 85, 247, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            }}>
              <Plus size={20} />
              {loading ? "Deploying..." : "Deploy to Hub"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAppModal;
