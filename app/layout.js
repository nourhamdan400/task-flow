import "./globals.css";
import { AuthProvider } from "@/hooks/auth";
import { PreferencesProvider } from "@/hooks/preferences";
import Nav from "@/components/Nav";

export const metadata = { title: "TaskFlow — Project management", description: "A clear workspace for your projects and tasks." };
export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var l=localStorage.getItem("taskflow-language");var t=localStorage.getItem("taskflow-theme");document.documentElement.lang=l==="ar"?"ar":"en";document.documentElement.dir=l==="ar"?"rtl":"ltr";document.documentElement.dataset.theme=t==="dark"?"dark":"light"}catch(e){}` }} />
      </head>
      <body>
        <PreferencesProvider>
          <AuthProvider>
            <Nav />
            <main className="main-content">{children}</main>
          </AuthProvider>
        </PreferencesProvider>
    </body></html>
  );
}
