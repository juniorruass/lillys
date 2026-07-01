export default function Loading() {
  return (
    <div className="flex-1 p-4 lg:p-8 max-w-4xl w-full mx-auto animate-pulse">
      <div className="h-8 w-40 bg-[#E2E8F0] rounded-xl mb-6" />
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-[#E2E8F0] rounded-2xl" />
        ))}
      </div>
      <div className="h-48 bg-[#E2E8F0] rounded-2xl mb-4" />
      <div className="h-32 bg-[#E2E8F0] rounded-2xl" />
    </div>
  );
}
