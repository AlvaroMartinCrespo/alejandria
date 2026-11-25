const constellations = [
  {
    name: "north",
    points: [[28, 112], [78, 70], [132, 88], [177, 36], [238, 56], [204, 128]],
    path: "M28 112 78 70 132 88 177 36 238 56 204 128 132 88",
  },
  {
    name: "south",
    points: [[32, 54], [88, 98], [146, 66], [201, 114], [246, 76], [164, 140]],
    path: "M32 54 88 98 146 66 201 114 246 76 M201 114 164 140",
  },
];

export function CosmicAtmosphere({ extended = false }: { extended?: boolean }) {

  return (
    <>
      {extended && <div className="cosmic-depth" aria-hidden="true" />}
    <div className="cosmic-atmosphere" aria-hidden="true">
      <span className="cosmic-nebula cosmic-nebula-one" />
      <span className="cosmic-nebula cosmic-nebula-two" />
      {constellations.map((constellation) => (
        <svg key={constellation.name} className={`cosmic-constellation cosmic-constellation-${constellation.name}`} viewBox="0 0 280 180" focusable="false">
          <path d={constellation.path} />
          {constellation.points.map(([horizontal, vertical], index) => (
            <circle key={index} cx={horizontal} cy={vertical} r={index === 2 ? 2.3 : 1.65} />
          ))}
        </svg>
      ))}
    </div>
    </>
  );
}
