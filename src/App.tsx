import { useEffect, useState } from "react";
import { ToastProvider } from "./components/ui";
import { FeedbackFab } from "./components/Feedback";
import { runReminderJob } from "./lib/store";
import Landing from "./views/Landing";
import PublicPage from "./views/PublicPage";
import SalonPage from "./views/SalonPage";
import MyBookings from "./views/MyBookings";
import Login from "./views/Login";
import Cabinet from "./views/cabinet/Cabinet";
import Admin from "./views/admin/Admin";

function useHash() {
  const [h, setH] = useState(() => location.hash);
  useEffect(() => {
    const f = () => {
      setH(location.hash);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return h;
}

export default function App() {
  const hash = useHash();

  useEffect(() => {
    runReminderJob();
  }, []);

  const path = hash.replace(/^#/, "") || "/";
  let view: React.ReactNode;
  if (path.startsWith("/m/")) {
    const [slugPart, query] = path.slice(3).split("?");
    const initialDate = new URLSearchParams(query ?? "").get("date") ?? undefined;
    view = <PublicPage slug={decodeURIComponent(slugPart)} initialDate={initialDate} key={path} />;
  } else if (path.startsWith("/salon/")) {
    view = <SalonPage slug={decodeURIComponent(path.slice(7))} key={path} />;
  } else if (path === "/my") {
    view = <MyBookings />;
  } else if (path === "/login") {
    view = <Login />;
  } else if (path === "/app") {
    view = <Cabinet />;
  } else if (path === "/admin") {
    view = <Admin />;
  } else {
    view = <Landing />;
  }

  return (
    <ToastProvider>
      <div className="overflow-x-clip">{view}</div>
      <FeedbackFab />
    </ToastProvider>
  );
}
