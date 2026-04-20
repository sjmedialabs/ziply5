"use client"

import { useEffect } from "react"
import StarterKit from "@tiptap/starter-kit"
import { EditorContent, useEditor } from "@tiptap/react"

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (html: string) => void
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          "prose max-w-none min-h-[120px] rounded-b-lg border border-[#D9D9D1] px-3 py-2 text-sm outline-none focus:border-[#7B3010]",
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) return null

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-t-lg border border-b-0 border-[#D9D9D1] bg-[#FFFBF3] p-2 text-xs">
        <button type="button" onClick={() => editor.chain().focus().setParagraph().run()} className={`rounded px-2 py-1 cursor-pointer hover:bg-gray-50 transition-colors ${editor.isActive("paragraph") ? "bg-[#7B3010] text-white hover:bg-[#7B3010]" : "bg-white"}`}>
          P
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`rounded cursor-pointer px-2 py-1 hover:bg-gray-50 transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-[#7B3010] text-white hover:bg-[#7B3010]" : "bg-white"}`}>
          H2
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`rounded cursor-pointer px-2 py-1 hover:bg-gray-50 transition-colors ${editor.isActive("heading", { level: 3 }) ? "bg-[#7B3010] text-white hover:bg-[#7B3010]" : "bg-white"}`}>
          H3
        </button>
        <div className="w-px bg-[#D9D9D1] mx-1 my-1"></div>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`rounded px-2 py-1 cursor-pointer  hover:bg-gray-50 transition-colors ${editor.isActive("bold") ? "bg-[#7B3010] text-white hover:bg-[#7B3010]" : "bg-white"}`}>
          Bold
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`rounded px-2 py-1 cursor-pointer hover:bg-gray-50 transition-colors ${editor.isActive("italic") ? "bg-[#7B3010] text-white hover:bg-[#7B3010]" : "bg-white"}`}>
          Italic
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`rounded px-2 py-1 cursor-pointer hover:bg-gray-50 transition-colors ${editor.isActive("strike") ? "bg-[#7B3010] text-white hover:bg-[#7B3010]" : "bg-white"}`}>
          Strike
        </button>
        <div className="w-px bg-[#D9D9D1] mx-1 my-1"></div>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`rounded px-2 py-1 cursor-pointer hover:bg-gray-50 transition-colors ${editor.isActive("bulletList") ? "bg-[#7B3010] text-white hover:bg-[#7B3010]" : "bg-white"}`}>
          Bullets
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`rounded px-2 py-1 cursor-pointer hover:bg-gray-50 transition-colors ${editor.isActive("orderedList") ? "bg-[#7B3010] text-white hover:bg-[#7B3010]" : "bg-white"}`}>
          Numbered
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`rounded px-2 py-1 cursor-pointer hover:bg-gray-50 transition-colors ${editor.isActive("blockquote") ? "bg-[#7B3010] text-white hover:bg-[#7B3010]" : "bg-white"}`}>
          Quote
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="rounded px-2 py-1 cursor-pointer bg-white hover:bg-gray-50 transition-colors">
          Divider
        </button>
        <div className="w-px bg-[#D9D9D1] cursor-pointer mx-1 my-1"></div>
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="rounded px-2 py-1 bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          Undo
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="rounded px-2 py-1 bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          Redo
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
