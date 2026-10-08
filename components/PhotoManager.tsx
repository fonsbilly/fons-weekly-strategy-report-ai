"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "submission-photos";

type Photo = { id: string; path: string; url: string };

export default function PhotoManager({
  directorId,
  branch,
  weekStart,
}: {
  directorId: string;
  branch: string;
  weekStart: string;
}) {
  const supabase = createClient();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data: rows } = await supabase
      .from("submission_photos")
      .select("id, storage_path")
      .eq("director_id", directorId)
      .eq("week_start", weekStart)
      .order("created_at");

    if (!rows || rows.length === 0) {
      setPhotos([]);
      return;
    }

    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(
        rows.map((r: any) => r.storage_path),
        3600
      );
    const urlByPath = new Map((signed ?? []).map((s: any) => [s.path, s.signedUrl]));
    setPhotos(
      rows.map((r: any) => ({ id: r.id, path: r.storage_path, url: urlByPath.get(r.storage_path) ?? "" }))
    );
  }, [directorId, weekStart, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files can be attached.");
        continue;
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${directorId}/${weekStart}/${crypto.randomUUID()}-${safeName}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (upErr) {
        setError(upErr.message);
        continue;
      }

      const { error: insErr } = await supabase.from("submission_photos").insert({
        director_id: directorId,
        branch,
        week_start: weekStart,
        storage_path: path,
      });
      if (insErr) setError(insErr.message);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    await load();
  }

  async function remove(photo: Photo) {
    await supabase.storage.from(BUCKET).remove([photo.path]);
    await supabase.from("submission_photos").delete().eq("id", photo.id);
    await load();
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <strong>Photos (optional)</strong>
        <label style={buttonStyle}>
          {uploading ? "Uploading…" : "+ Add photos"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </label>
      </div>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        Attach site photos, rack builds, event shots, etc. Visible only to you and your RVP.
      </p>

      {error && <p style={{ color: "#f87171" }}>{error}</p>}

      {photos.length > 0 && (
        <div style={gridStyle}>
          {photos.map((p) => (
            <div key={p.id} style={thumbWrapStyle}>
              <a href={p.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="attachment" style={thumbStyle} />
              </a>
              <button type="button" onClick={() => remove(p)} style={removeBtnStyle} title="Remove">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const buttonStyle: CSSProperties = {
  padding: "0.4rem 0.9rem",
  background: "var(--accent)",
  border: "none",
  borderRadius: 6,
  color: "#0f172a",
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: "0.75rem",
};

const thumbWrapStyle: CSSProperties = { position: "relative" };

const thumbStyle: CSSProperties = {
  width: "100%",
  height: 120,
  objectFit: "cover",
  borderRadius: 6,
  border: "1px solid var(--border)",
  display: "block",
};

const removeBtnStyle: CSSProperties = {
  position: "absolute",
  top: 4,
  right: 4,
  width: 22,
  height: 22,
  borderRadius: "50%",
  border: "none",
  background: "rgba(0,0,0,0.65)",
  color: "#fff",
  cursor: "pointer",
  fontSize: "0.75rem",
  lineHeight: 1,
};
