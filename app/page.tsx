import { LaunchForm } from "@/components/launch-form";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-6 py-16 text-center text-neutral-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/nuts.jpg"
        alt=""
        className="w-full max-w-[420px] select-none"
        draggable={false}
      />
      <div className="flex flex-col gap-3">
        <p className="text-lg text-neutral-500 sm:text-xl">
          For those who don&rsquo;t know how to code:
        </p>
        <p className="text-3xl font-bold tracking-tight sm:text-4xl">
          Launch your NUTS today!
        </p>
      </div>
      <LaunchForm />
    </main>
  );
}
