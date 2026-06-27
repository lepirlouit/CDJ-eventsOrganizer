import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import Tooltip from "@mui/material/Tooltip";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import LinkIcon from "@mui/icons-material/Link";
import ImageIcon from "@mui/icons-material/Image";
import { api } from "../../lib/api";

/**
 * Asks the API for a presigned PUT URL, uploads the file straight to S3, and
 * returns the relative path to embed (e.g. "/uploads/events/<ulid>.png"). The PUT
 * uses raw fetch — NOT the shared `api` axios instance — because the presigned URL
 * is already signed and an injected Authorization header would break the signature.
 */
async function uploadImage(file: File): Promise<string> {
  const { data } = await api.post("/admin/uploads/presign", { contentType: file.type });
  const res = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return `/${data.key}`;
}

interface DescriptionEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function DescriptionEditor({ value, onChange }: DescriptionEditorProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      // StarterKit v3 bundles Link (and Underline); configure rather than re-add.
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      Image.configure({ inline: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      handlePaste: (_view, event) => {
        const file = Array.from(event.clipboardData?.items ?? [])
          .find((i) => i.type.startsWith("image/"))
          ?.getAsFile();
        if (!file) return false;
        insertImage(file);
        return true;
      },
      handleDrop: (_view, event) => {
        const file = (event as DragEvent).dataTransfer?.files?.[0];
        if (!file?.type.startsWith("image/")) return false;
        event.preventDefault();
        insertImage(file);
        return true;
      },
    },
  });

  // Keep the editor in sync when the form prefills/resets `value` externally
  // (e.g. loading an event to edit). Guard against the onUpdate→onChange loop.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  function insertImage(file: File) {
    uploadImage(file)
      .then((src) => editor?.chain().focus().setImage({ src }).run())
      .catch((e) => console.error(e));
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) insertImage(file);
    e.target.value = ""; // allow re-selecting the same file
  }

  function setLink() {
    const prev = editor?.getAttributes("link").href as string | undefined;
    const url = window.prompt(t("admin.event_form.link_prompt"), prev ?? "https://");
    if (url === null) return; // cancelled
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  if (!editor) return null;

  return (
    <Paper variant="outlined" sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, p: 0.5 }}>
        <Tooltip title={t("admin.event_form.toolbar.bold")}>
          <ToggleButton
            value="bold"
            size="small"
            selected={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <FormatBoldIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title={t("admin.event_form.toolbar.italic")}>
          <ToggleButton
            value="italic"
            size="small"
            selected={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <FormatItalicIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title={t("admin.event_form.toolbar.heading")}>
          <ToggleButton
            value="h2"
            size="small"
            selected={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </ToggleButton>
        </Tooltip>
        <Tooltip title={t("admin.event_form.toolbar.subheading")}>
          <ToggleButton
            value="h3"
            size="small"
            selected={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </ToggleButton>
        </Tooltip>
        <Tooltip title={t("admin.event_form.toolbar.bullet_list")}>
          <ToggleButton
            value="bulletList"
            size="small"
            selected={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <FormatListBulletedIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title={t("admin.event_form.toolbar.numbered_list")}>
          <ToggleButton
            value="orderedList"
            size="small"
            selected={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <FormatListNumberedIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title={t("admin.event_form.toolbar.link")}>
          <ToggleButton value="link" size="small" selected={editor.isActive("link")} onClick={setLink}>
            <LinkIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title={t("admin.event_form.toolbar.image")}>
          <ToggleButton value="image" size="small" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          hidden
          onChange={onPickImage}
        />
      </Box>
      <Divider />
      <Box
        sx={{
          p: 1.5,
          "& .ProseMirror": { minHeight: 140, outline: "none" },
          "& .ProseMirror img": { maxWidth: "100%", height: "auto", borderRadius: 1 },
          "& .ProseMirror p": { my: 0.5 },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
}
