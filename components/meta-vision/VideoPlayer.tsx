"use client";

export type VideoPlayerProps = {
  type: "svg" | "video";
  src: string;
};

export default function VideoPlayer({ type, src }: VideoPlayerProps) {
  if (type === "video") {
    return (
      <video src={src} controls autoPlay muted className="rounded-lg w-full" />
    );
  }
  if (type === "svg") {
    return <img src={src} alt="Animation" className="w-full h-auto" />;
  }
  return null;
}
