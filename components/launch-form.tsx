"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DeployerInfo = { address: string; balanceSol: number };

type LaunchResult = {
  mint: string;
  signature: string;
  pumpUrl: string;
  solscanUrl: string;
};

type Status = "idle" | "launching" | "success" | "error";

function truncate(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function LaunchForm() {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [deployer, setDeployer] = useState<DeployerInfo | null>(null);
  const [deployerError, setDeployerError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LaunchResult | null>(null);

  useEffect(() => {
    fetch("/api/launch")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setDeployerError(data.error);
        else setDeployer(data as DeployerInfo);
      })
      .catch(() => setDeployerError("Deployer wallet unavailable."));
  }, []);

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImage(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!image) {
      setError("Pick an image first.");
      setStatus("error");
      return;
    }
    setStatus("launching");
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("symbol", symbol);
      form.append("image", image);
      const res = await fetch("/api/launch", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Launch failed.");
      setResult(data as LaunchResult);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed.");
      setStatus("error");
    }
  }

  const launching = status === "launching";
  const outOfSol = deployer !== null && deployer.balanceSol < 0.005;

  return (
    <Card className="w-full max-w-md text-left">
      <CardHeader>
        <CardTitle>Launch a token</CardTitle>
        <CardDescription>
          Real token, real pump.fun, real SOL. No takesies-backsies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="token-name">Name</Label>
            <Input
              id="token-name"
              placeholder="No Utility Token"
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="token-symbol">Ticker</Label>
            <Input
              id="token-symbol"
              placeholder="NUTS"
              value={symbol}
              maxLength={10}
              onChange={(e) => setSymbol(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="token-image">Image</Label>
            <Input
              id="token-image"
              type="file"
              accept="image/*"
              onChange={onImageChange}
              required
            />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt=""
                className="mt-1 h-24 w-24 rounded-md border object-cover"
              />
            ) : null}
          </div>
          <Button type="submit" disabled={launching || !!deployerError}>
            {launching ? "Launching…" : "Launch on pump.fun"}
          </Button>
          <p className="text-xs text-neutral-500">
            Deploys from the NUTS wallet
            {deployer ? (
              <>
                {" "}
                <a
                  href={`https://solscan.io/account/${deployer.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono underline"
                >
                  {truncate(deployer.address)}
                </a>{" "}
                ({deployer.balanceSol.toFixed(4)} SOL)
              </>
            ) : null}
            . Each launch spends its SOL (~0.02).
          </p>
          {outOfSol ? (
            <p className="text-sm font-medium text-red-600">
              Deployer wallet is out of SOL. Send SOL to {deployer?.address} to
              enable launches.
            </p>
          ) : null}
          {deployerError ? (
            <p className="text-sm font-medium text-red-600">{deployerError}</p>
          ) : null}
          {status === "error" && error ? (
            <p className="text-sm font-medium text-red-600">{error}</p>
          ) : null}
          {status === "success" && result ? (
            <div className="flex flex-col gap-1 text-sm font-medium text-green-700">
              <p>Token is live.</p>
              <p>
                <a
                  href={result.pumpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  View on pump.fun
                </a>{" "}
                ·{" "}
                <a
                  href={result.solscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  View transaction
                </a>
              </p>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
