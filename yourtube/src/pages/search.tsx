import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import SearchResult from "@/components/SearchResult";

export default function Search() {
  const router = useRouter();
  const { q } = router.query;
  const query = typeof q === "string" ? q : "";

  return (
    <Layout title={query ? `${query} - Search - YourTube` : "Search - YourTube"}>
      {router.isReady && <SearchResult query={query} />}
    </Layout>
  );
}
