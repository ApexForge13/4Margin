export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Job Detail</h1>
      <p className="text-muted-foreground mt-2">Job {id} detail coming soon.</p>
    </div>
  );
}
