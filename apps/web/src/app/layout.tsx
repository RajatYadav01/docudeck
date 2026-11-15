import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: { default: "Docudeck", template: "%s · Docudeck" },
	description: "A calm, collaborative workspace for your documents.",
	icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
