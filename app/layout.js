import "./globals.css";
import { AuthProvider } from "@/hooks/auth";
import { PreferencesProvider } from "@/hooks/preferences";
import Nav from "@/components/Nav";

export const metadata = {
  title: "TaskFlow — Project management",
  description: "A clear workspace for your projects and tasks.",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var l=localStorage.getItem("taskflow-language");var t=localStorage.getItem("taskflow-theme");document.documentElement.lang=l==="ar"?"ar":"en";document.documentElement.dir=l==="ar"?"rtl":"ltr";document.documentElement.dataset.theme=t==="dark"?"dark":"light";document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="taskflow-body">
        <PreferencesProvider>
          <AuthProvider>
            <div className="w-full min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-900">
              <Nav />
              <main className="main-content w-full min-w-0 min-h-screen overflow-x-hidden px-4 sm:px-6 lg:px-10 dark:text-white">
                {children}
              </main>
            </div>
          </AuthProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
