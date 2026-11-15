import { DocumentWorkspace } from "@/features/editor/components/document-workspace";

export default async function DocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
	const { documentId } = await params;
	return <DocumentWorkspace documentId={documentId} />;
}
