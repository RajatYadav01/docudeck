"use client";

import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading1, Heading2, Italic, List, ListOrdered, Quote, Redo2, Underline as UnderlineIcon, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";

export function DocumentEditor({
	content,
	editable,
	onChange,
}: {
	content: unknown;
	editable: boolean;
	onChange: (content: unknown) => void;
}) {
	const [selectionTick, setSelectionTick] = useState(0);
	const editor = useEditor({
		extensions: [StarterKit, Underline],
		content: content as never,
		editable,
		immediatelyRender: false,
		editorProps: { attributes: { class: "tiptap", "aria-label": "Document content" } },
		onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getJSON()),
		onSelectionUpdate: () => setSelectionTick((value) => value + 1),
	});

	useEffect(() => {
		if (!editor) return;
		editor.setEditable(editable);
	}, [editor, editable]);

	useEffect(() => {
		if (!editor) return;
		// Avoid resetting the ProseMirror selection on every keystroke when the parent stores JSON.
		if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
			editor.commands.setContent(content as never, { emitUpdate: false });
		}
	}, [editor, content]);

	if (!editor) return <div className="min-h-[520px] animate-pulse rounded-xl bg-surface-muted" />;
	return (
		<div className="w-full">
			<div className="no-print sticky top-16 z-10 mb-4 flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-2 shadow-sm">
				<ToolbarButton
					label="Bold"
					active={editor.isActive("bold")}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleBold().run()}
				>
					<Bold size={16} />
				</ToolbarButton>
				<ToolbarButton
					label="Italic"
					active={editor.isActive("italic")}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleItalic().run()}
				>
					<Italic size={16} />
				</ToolbarButton>
				<ToolbarButton
					label="Underline"
					active={editor.isActive("underline")}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleUnderline().run()}
				>
					<UnderlineIcon size={16} />
				</ToolbarButton>
				<span className="mx-1 h-6 w-px bg-line" />
				<ToolbarButton
					label="Heading 1"
					active={editor.isActive("heading", { level: 1 })}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
				>
					<Heading1 size={17} />
				</ToolbarButton>
				<ToolbarButton
					label="Heading 2"
					active={editor.isActive("heading", { level: 2 })}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				>
					<Heading2 size={17} />
				</ToolbarButton>
				<span className="mx-1 h-6 w-px bg-line" />
				<ToolbarButton
					label="Bulleted list"
					active={editor.isActive("bulletList")}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleBulletList().run()}
				>
					<List size={17} />
				</ToolbarButton>
				<ToolbarButton
					label="Numbered list"
					active={editor.isActive("orderedList")}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
				>
					<ListOrdered size={17} />
				</ToolbarButton>
				<ToolbarButton
					label="Quote"
					active={editor.isActive("blockquote")}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleBlockquote().run()}
				>
					<Quote size={16} />
				</ToolbarButton>
				<span className="mx-1 h-6 w-px bg-line" />
				<ToolbarButton
					label="Undo"
					disabled={!editable || !editor.can().undo()}
					onClick={() => editor.chain().focus().undo().run()}
				>
					<Undo2 size={16} />
				</ToolbarButton>
				<ToolbarButton
					label="Redo"
					disabled={!editable || !editor.can().redo()}
					onClick={() => editor.chain().focus().redo().run()}
				>
					<Redo2 size={16} />
				</ToolbarButton>
				<button
					type="button"
					onClick={() => editor.chain().focus().setParagraph().run()}
					disabled={!editable}
					className="ml-auto rounded-lg px-2.5 py-2 text-[11px] font-medium text-muted hover:bg-surface-muted disabled:opacity-40"
				>
					Normal text
				</button>
			</div>
			<div className="print-document min-h-[650px] rounded-2xl border border-line bg-editor px-7 py-10 shadow-sm sm:px-12 sm:py-14">
				<EditorContent editor={editor} />
				{!editable && (
					<p className="no-print mt-8 border-t border-line pt-4 text-xs text-muted">
						You have view-only access to this document.
					</p>
				)}
			</div>
			<span className="sr-only" aria-live="polite">
				Editor selection state {selectionTick}
			</span>
		</div>
	);
}

function ToolbarButton({
	children,
	label,
	active,
	disabled,
	onClick,
}: {
	children: React.ReactNode;
	label: string;
	active?: boolean;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			aria-pressed={active}
			disabled={disabled}
			onClick={onClick}
			className={`grid h-8 w-8 place-items-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-30 ${active ? "bg-ink text-white" : "text-ink-soft hover:bg-surface-muted"}`}
		>
			{children}
		</button>
	);
}
