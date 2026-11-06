// The stitched asterisk that sits behind the header, top right.
export function CornerArt() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[353px] overflow-hidden md:block">
      <img src="/stitch.svg" width={600} height={600} alt="" className="absolute top-[-247px] left-[calc(50%+270px)] max-w-none" />
    </div>
  );
}
