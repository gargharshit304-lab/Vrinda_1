import { useEffect, useState } from "react";
import { apiRequest } from "../data/apiClient";

const buildReplyMailto = (message) => {
  const recipient = encodeURIComponent(message?.email || "");
  const subject = encodeURIComponent("Regarding your query");
  const body = encodeURIComponent(`Hi ${message?.name || "there"},\n\n`);

  return `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`;
};

export default function AdminContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadMessages = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest("/contact", { method: "GET", auth: true });
        if (!cancelled) setMessages(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load contact messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="glass-card p-4">
      <h3 className="font-display text-2xl font-semibold text-sage-800">Contact Messages</h3>

      {loading ? (
        <p className="mt-4 text-sm text-sage-600">Loading messages…</p>
      ) : error ? (
        <p className="mt-4 text-sm text-rose-700">{error}</p>
      ) : messages.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-sage-200/80 bg-white/70 p-6 text-center text-sm text-sage-700">
          No messages yet
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-sage-200/80 bg-white/70">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed">
              <thead>
                <tr className="bg-[#faf8f4] text-left text-xs uppercase text-sage-600">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m._id} className="border-t border-sage-100 even:bg-[#fffdf8]">
                    <td className="px-4 py-3 align-top text-sm text-sage-800">{m.name}</td>
                    <td className="px-4 py-3 align-top text-sm text-sage-700">{m.email}</td>
                    <td className="px-4 py-3 align-top text-sm text-sage-700">{m.message}</td>
                    <td className="px-4 py-3 align-top text-sm text-sage-600">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 align-top">
                      <a
                        href={buildReplyMailto(m)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-700 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 hover:shadow-sm"
                      >
                        Reply
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
