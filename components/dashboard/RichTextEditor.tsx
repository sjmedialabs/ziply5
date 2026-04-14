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
          "min-h-[120px] rounded-b-lg border border-[#D9D9D1] px-3 py-2 text-sm outline-none focus:border-[#7B3010]",
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
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`rounded px-2 py-1 ${editor.isActive("bold") ? "bg-[#7B3010] text-white" : "bg-white"}`}>
          Bold
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`rounded px-2 py-1 ${editor.isActive("italic") ? "bg-[#7B3010] text-white" : "bg-white"}`}>
          Italic
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`rounded px-2 py-1 ${editor.isActive("bulletList") ? "bg-[#7B3010] text-white" : "bg-white"}`}>
          Bullets
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`rounded px-2 py-1 ${editor.isActive("orderedList") ? "bg-[#7B3010] text-white" : "bg-white"}`}>
          Numbered
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
