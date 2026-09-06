import Layout from "@/components/Layout";
import { useAuth } from "@/lib/AuthContext";

// NOTE (known limitation, issue #8 from the audit): the original project has
// no Subscription collection/routes on the backend at all, so this page
// cannot show real subscription data yet. Rather than fake it with static
// placeholder videos, this page says so plainly. To make this real you'd
// need to add a Subscription model (subscriber -> channel) plus
// GET/POST /subscription routes, then swap this placeholder for a
// VideoGrid fed by subscribed channels' videos.
export default function Subscriptions() {
  const { user, loading } = useAuth();

  return (
    <Layout title="Subscriptions - YourTube">
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : !user ? (
          <p className="text-gray-700 font-medium">Sign in to see your subscriptions.</p>
        ) : (
          <>
            <p className="text-gray-700 font-medium">Subscriptions aren&apos;t wired up yet.</p>
            <p className="text-gray-500 text-sm mt-2 max-w-md">
              This feature needs a Subscription model and API routes on the
              backend that don&apos;t exist yet. It&apos;s tracked as a
              known gap rather than shown with fake data.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
