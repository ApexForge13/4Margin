export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Quote Detail</h1>
      <p className="text-muted-foreground mt-2">Quote {id} detail coming soon.</p>
    </div>
  );
}
