import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { LoadingSpinner } from "./LoadingSpinner";

export default function InvitationCompletionRedirect({ to }) {
  const navigate = useNavigate();
  const { refreshBackendUser } = useAuth();
  const [syncMessage, setSyncMessage] = useState("Finishing your chapter membership...");

  useEffect(() => {
    let cancelled = false;

    async function finishInvitation() {
      try {
        await refreshBackendUser({ refreshFfaAccess: true });
      } catch {
        if (!cancelled) {
          setSyncMessage("Opening your account...");
        }
      } finally {
        if (!cancelled) navigate(to, { replace: true });
      }
    }

    finishInvitation();
    return () => {
      cancelled = true;
    };
  }, [navigate, refreshBackendUser, to]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#0b1730] px-4 text-white">
      <LoadingSpinner label={syncMessage} />
    </main>
  );
}
