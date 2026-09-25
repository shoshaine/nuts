export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/nuts.jpg"
        alt=""
        className="w-full max-w-[560px] select-none"
        draggable={false}
      />
      <div className="flex flex-col gap-3">
        <p className="text-lg text-neutral-300 sm:text-xl">
          For those who don&rsquo;t know how to code:
        </p>
        <p className="text-3xl font-bold tracking-tight sm:text-4xl">
          Launch your NUTS today!
        </p>
      </div>
    </main>
  );
}
