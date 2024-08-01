class Point {
  constructor(public x: number, public y: number) {}

  add(other: Point) {
    return new Point(this.x + other.x, this.y + other.y);
  }

  subtract(other: Point) {
    return new Point(this.x - other.x, this.y - other.y);
  }

  multiply(other: Point) {
    return new Point(this.x * other.x, this.y * other.y);
  }

  divide(other: Point) {
    return new Point(this.x / other.x, this.y / other.y);
  }

  equals(other: Point) {
    return this.x === other.x && this.y === other.y;
  }

  angleTo(other: Point) {
    return Math.atan2(other.y - this.y, other.x - this.x);
  }

  toString() {
    return `(${this.x}, ${this.y})`;
  }
}

class Line {
  // ax + by + c = 0
  constructor(public a: number, public b: number, public c: number) {}

  static fromPoints(p1: Point, p2: Point) {
    const a = Line.getA(p1, p2);
    const b = Line.getB(p1, p2);
    const c = Line.getC(p1, p2);

    return new Line(a, b, c);
  }

  static getA(p1: Point, p2: Point) {
    return p1.y - p2.y;
  }

  static getB(p1: Point, p2: Point) {
    return p2.x - p1.x;
  }

  static getC(p1: Point, p2: Point) {
    const a = Line.getA(p1, p2);
    const b = Line.getB(p1, p2);
    return -a * p1.x - b * p1.y;
  }

  isEqual(other: Line) {
    const a = this.a === other.a;
    const b = this.b === other.b;
    const c = this.c === other.c;
    return a && b && c;
  }

  toString() {
    return `${this.a}x + ${this.b}y + ${this.c} = 0`;
  }
}

class Segment extends Line {
  constructor(public p1: Point, public p2: Point) {
    super(Line.getA(p1, p2), Line.getB(p1, p2), Line.getC(p1, p2));
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    ppi: number,
    color: string,
    width: number
  ) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(this.p1.x * ppi, this.p1.y * ppi);
    ctx.lineTo(this.p2.x * ppi, this.p2.y * ppi);
    ctx.stroke();
  }

  public pointOn(point: Point) {
    // assume point is on the line, check if it is on the segment

    const minX = Math.min(this.p1.x, this.p2.x);
    const maxX = Math.max(this.p1.x, this.p2.x);
    const minY = Math.min(this.p1.y, this.p2.y);
    const maxY = Math.max(this.p1.y, this.p2.y);

    const inX =
      +point.x.toFixed(2) >= +minX.toFixed(2) &&
      +point.x.toFixed(2) <= +maxX.toFixed(2);
    const inY =
      +point.y.toFixed(2) >= +minY.toFixed(2) &&
      +point.y.toFixed(2) <= +maxY.toFixed(2);

    return inX && inY;
  }

  toString(): string {
    return `${this.p1.toString()} -> ${this.p2.toString()}`;
  }

  public circleIntersection(center: Point, radius: number) {
    // find closest point on the line to the center
    const segment = new Segment(
      this.p1.subtract(center),
      this.p2.subtract(center)
    );

    const a = segment.a;
    const b = segment.b;
    const c = segment.c;

    const d0 = Math.abs(c) / Math.sqrt(a * a + b * b);

    if (d0 > radius) {
      return [];
    }

    const x0 = (-a * c) / (a * a + b * b);
    const y0 = (-b * c) / (a * a + b * b);

    if (d0 === radius) {
      const arr = [new Point(x0, y0)].map((point) => point.add(center));

      return arr.filter((point) => this.pointOn(point));
    }

    const d = Math.sqrt(radius * radius - (c * c) / (a * a + b * b));
    const mult = Math.sqrt((d * d) / (a * a + b * b));

    const x1 = x0 + b * mult;
    const y1 = y0 - a * mult;

    const x2 = x0 - b * mult;
    const y2 = y0 + a * mult;

    const points = [new Point(x1, y1), new Point(x2, y2)];

    // debugger;

    const filtered = points.filter((point) => segment.pointOn(point));

    // debugger;

    return filtered.map((point) => point.add(center));

    // return points
    // .map((point) => point.add(center))
    // .filter((point) => this.pointOn(point));
  }
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function setupCanvas(canvas: HTMLCanvasElement) {
  const trail = new Array<Point>();

  console.log(canvas);

  const ppi = 10; // pixels per inch
  const tileSize = 24;
  const tiles = 6;
  canvas.width = tiles * tileSize * ppi;
  canvas.height = tiles * tileSize * ppi;

  const ctx = canvas.getContext("2d")!;

  const robot = {
    position: new Point(-8, 10),
    // position: new Point(40, 0),
    heading: 0,
    size: {
      width: 14,
      height: 18,
    },
    lookahead: tileSize / 2,
  };

  const pathPoints: Point[] = [
    new Point(0, 0),
    new Point(tileSize * 2, 0),
    new Point(tileSize * 2, tileSize * 2),
    new Point(0, tileSize * 2),
  ];

  const pathSegments: Segment[] = [];
  for (let i = 0; i < pathPoints.length - 1; i++) {
    pathSegments.push(new Segment(pathPoints[i], pathPoints[i + 1]));
  }

  // console.log(pathPoints, pathSegments);

  // make the origin the center of the canvas
  ctx.translate((tiles * tileSize * ppi) / 2, (tiles * tileSize * ppi) / 2);

  let lastIntersection = pathPoints[0];

  const render = () => {
    ctx.clearRect(
      -canvas.width / 2,
      -canvas.height / 2,
      canvas.width,
      canvas.height
    );

    drawGrid(ctx, tileSize, tiles, ppi);
    pathSegments.forEach((segment) => segment.draw(ctx, ppi, "aqua", 4));
    drawRobot(ctx, robot, ppi);

    // draw trail
    if (trail.length) {
      // console.log(trail);
      ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(trail[0].x * ppi, trail[0].y * ppi);
      trail.forEach((point) => ctx.lineTo(point.x * ppi, point.y * ppi));
      ctx.stroke();
    }

    const intersections = pathSegments
      .map((segment) =>
        segment.circleIntersection(robot.position, robot.lookahead)
      )
      .flat();

    intersections.forEach((point) => {
      ctx.fillStyle = "aqua";
      ctx.beginPath();
      ctx.arc(point.x * ppi, point.y * ppi, 10, 0, 2 * Math.PI);
      ctx.fill();
    });

    let angledIntersections = intersections
      .map((point) => {
        return {
          point,
          angle: toDegrees(robot.position.angleTo(point)),
        };
      })
      .sort((a, b) => a.angle - b.angle)
      .filter((intersection) => {
        const angleDiff = intersection.angle - robot.heading;
        return Math.abs(angleDiff) < 90;
      });

    if (!angledIntersections.length) {
      angledIntersections = [
        {
          point: lastIntersection,
          angle: toDegrees(robot.position.angleTo(lastIntersection)),
        }
      ]
    }

    const closestIntersection = angledIntersections[0];
    lastIntersection = closestIntersection?.point || lastIntersection;

    console.log(closestIntersection);

    const angleDiff = closestIntersection.angle - robot.heading;
    // console.log(angleDiff);
    const scalledDiff = angleDiff / 4;

    const turnSpeed = 2;

    robot.heading += Math.min(turnSpeed, Math.max(-turnSpeed, scalledDiff));

    const dist = Math.abs(robot.position.subtract(closestIntersection.point).x);

    const speed = 1 / 2;
    // const move = new Point(0, 0);
    // move.x = Math.cos(toRadians(0));
    // move.y = Math.sin(toRadians(0));

    // const scaledMove = move.multiply(new Point(moveDir, moveDir));

    // console.log(scaledMove);

    // robot.position = robot.position.add(scaledMove);

    const diff = closestIntersection.point.subtract(robot.position);

    const denom = Math.max(Math.abs(diff.x) + Math.abs(diff.y), 1);

    const move = diff.divide(new Point(denom, denom));

    robot.position = robot.position.add(move.multiply(new Point(speed, speed)));

    trail.push(robot.position);

    if (Math.abs(diff.x) < 0.1 && Math.abs(diff.y) < 0.1) {
      return;
    }

    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);
}

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  tileSize: number,
  tiles: number,
  pixelPerInch: number
) => {
  ctx.fillStyle = "black";
  ctx.fillRect(
    0,
    0,
    tiles * tileSize * pixelPerInch,
    tiles * tileSize * pixelPerInch
  );

  ctx.strokeStyle = "white";
  ctx.lineWidth = 1;
  for (let i = -tiles / 2; i <= tiles / 2; i++) {
    for (let j = -tiles / 2; j <= tiles / 2; j++) {
      ctx.strokeRect(
        i * tileSize * pixelPerInch,
        j * tileSize * pixelPerInch,
        tileSize * pixelPerInch,
        tileSize * pixelPerInch
      );
    }
  }
};

const drawRobot = (
  ctx: CanvasRenderingContext2D,
  robot: {
    position: Point;
    heading: number;
    size: { width: number; height: number };
    lookahead: number;
  },
  pixelPerInch: number
) => {
  const { position, heading, size } = robot;
  const { width, height } = size;

  ctx.save();
  ctx.translate(position.x * pixelPerInch, position.y * pixelPerInch);
  ctx.rotate(toRadians(heading + 90));

  ctx.fillStyle = "red";
  ctx.fillRect(
    (-width / 2) * pixelPerInch,
    (-height / 2) * pixelPerInch,
    width * pixelPerInch,
    height * pixelPerInch
  );

  // darw look vector
  ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -height * pixelPerInch);
  ctx.stroke();

  // draw lookahead circl
  ctx.beginPath();
  ctx.arc(0, 0, robot.lookahead * pixelPerInch, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.restore();
};
