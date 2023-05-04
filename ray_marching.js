// Set Canvas Variables
const canvas = document.getElementById("canvas");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
canvas.style.backgroundColor = "#111";
const ctx = canvas.getContext("2d");

// Global Variables
var intersectionPoints = [];
var isPlaying = true;
var spinningAngle = 0;
var mouseX = 0;
var mouseY = 0;
var rotationSpeed = 0.003

// Number of shapes definition
var shapes = generateRandomShapes(Math.random() * 5 + 5);

// Play mode
function updateSpinningAngle() {
    if (isPlaying) {
        spinningAngle += rotationSpeed;
        if (spinningAngle > 2 * Math.PI) {
            spinningAngle -= 2 * Math.PI;
        }
        const start = { x: canvas.width / 2, y: canvas.height / 2 };
        const maxDistance = 10 * Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
        const minDistance = 0.1;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawShapes();
        render(start, spinningAngle, maxDistance, minDistance);
        drawIntersectionPoints();

        requestAnimationFrame(updateSpinningAngle);
    }
}

// Signed Distance Function
function signedDistanceToShapes(p) {
    return Math.min(...shapes.map(shape => {
        switch (shape.type) {
            case 'circle':
                const dx = p.x - shape.x;
                const dy = p.y - shape.y;
                return Math.sqrt(dx * dx + dy * dy) - shape.radius;
            case 'square':
                const d = { x: Math.abs(p.x - shape.x) - shape.size / 2, y: Math.abs(p.y - shape.y) - shape.size / 2 };
                return Math.min(Math.max(d.x, d.y), 0) + Math.sqrt(Math.max(Math.max(d.x, 0), 0) ** 2 + Math.max(Math.max(d.y, 0), 0) ** 2);
            case 'triangle':
                const k = Math.sqrt(3) / 2;
                const p1 = { x: shape.x - shape.size / 2, y: shape.y + k * shape.size / 2 };
                const p2 = { x: shape.x + shape.size / 2, y: shape.y + k * shape.size / 2 };
                const p3 = { x: shape.x, y: shape.y - k * shape.size / 2 };

                const d1 = lineToPointDistance(p, p1, p2);
                const d2 = lineToPointDistance(p, p2, p3);
                const d3 = lineToPointDistance(p, p3, p1);
                const minDist = Math.min(d1, d2, d3);

                const inTriangle = pointInTriangle(p, p1, p2, p3);
                return inTriangle ? -minDist : minDist;
        }
    }));
}

function lineToPointDistance(p, a, b) {
    const pa = { x: p.x - a.x, y: p.y - a.y };
    const ba = { x: b.x - a.x, y: b.y - a.y };
    const h = Math.max(0, Math.min(1, (pa.x * ba.x + pa.y * ba.y) / (ba.x * ba.x + ba.y * ba.y)));
    const proj = { x: a.x + h * ba.x, y: a.y + h * ba.y };
    const dx = p.x - proj.x;
    const dy = p.y - proj.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function pointInTriangle(p, p1, p2, p3) {
    const sign = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const d1 = sign(p, p1, p2);
    const d2 = sign(p, p2, p3);
    const d3 = sign(p, p3, p1);
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(hasNeg && hasPos);
}

function rayMarching(start, direction, maxSteps, maxDistance, minDistance) {
    let currentPosition = { x: start.x, y: start.y };
    let totalDistance = 0;
    const steps = [currentPosition];

    for (let step = 0; step < maxSteps; step++) {
        const distance = signedDistanceToShapes(currentPosition);
        totalDistance += distance;
        if (totalDistance >= maxDistance || distance < minDistance) {
            break;
        }

        currentPosition = {
            x: start.x + direction.x * totalDistance,
            y: start.y + direction.y * totalDistance,
        };
        steps.push(currentPosition);
    }

    return steps;
}


// Update the render function to draw a line through the ray and use better colors
function render(start, angle, maxDistance, minDistance) {
    const direction = {
        x: Math.cos(angle),
        y: Math.sin(angle),
    };

    const steps = rayMarching(start, direction, 200, maxDistance, 0.01);
    steps.forEach((step, index) => {
        ctx.beginPath();
        ctx.arc(step.x, step.y, 2, 0, 2 * Math.PI);
        const alpha = 1 - index / steps.length;
        ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
        ctx.fill();

        // Draw circles used for calculation
        ctx.beginPath();
        ctx.arc(step.x, step.y, signedDistanceToShapes(step), 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`;
        ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.2})`;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // Draw a line through the ray
    const endPoint = steps[steps.length - 1] || start;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw a white circle at the intersection point
    ctx.beginPath();
    ctx.arc(endPoint.x, endPoint.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.fill();

    // Add the intersection point to the intersectionPoints array
    intersectionPoints.push(endPoint);
}

function drawIntersectionPoints() {
    intersectionPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fill();
    });
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateRandomShapes(numShapes) {
    const shapes = [];
    const shapeTypes = ['circle', 'square', 'triangle'];
    const exclusionRadius = 150; // Exclude the center area

    for (let i = 0; i < numShapes; i++) {
        const type = shapeTypes[randomInt(0, shapeTypes.length - 1)];
        let x, y;
        do {
            x = randomInt(50, canvas.width - 50);
            y = randomInt(50, canvas.height - 50);
        } while (Math.sqrt((x - canvas.width / 2) ** 2 + (y - canvas.height / 2) ** 2) <= exclusionRadius);

        const shape = {
            type: type,
            x: x,
            y: y,
            size: randomInt(50, 100),
            radius: randomInt(25, 50),
            rotation: Math.random() * 2 * Math.PI,
        };
        shapes.push(shape);
    }

    return shapes;
}

function drawShapes() {
    shapes.forEach(shape => {
        ctx.beginPath();
        switch (shape.type) {
            case 'circle':
                ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
                break;
            case 'square':
                ctx.rect(shape.x - shape.size / 2, shape.y - shape.size / 2, shape.size, shape.size);
                break;
            case 'triangle':
                const k = Math.sqrt(3) / 2;
                ctx.moveTo(shape.x - shape.size / 2, shape.y + k * shape.size / 2);
                ctx.lineTo(shape.x + shape.size / 2, shape.y + k * shape.size / 2);
                ctx.lineTo(shape.x, shape.y - k * shape.size / 2);
                ctx.closePath();
                break;
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    });
}


function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    if (!isPlaying) {
        const start = { x: canvas.width / 2, y: canvas.height / 2 };
        const angle = Math.atan2(mouseY - start.y, mouseX - start.x);
        const maxDistance = 10 * Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
        const minDistance = 0.1;

        // Clear the canvas before rendering rays
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render shapes
        drawShapes();

        render(start, angle, maxDistance, minDistance);

        // Draw intersection points
        drawIntersectionPoints();
    }
}

// Interactive rendering
canvas.addEventListener("mousemove", (e) => {
    if (!isPlaying) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const start = { x: canvas.width / 2, y: canvas.height / 2 };
        const angle = Math.atan2(mouseY - start.y, mouseX - start.x);
        const maxDistance = 10 * Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
        const minDistance = 0.1;

        // Clear the canvas before rendering rays
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render shapes
        shapes.forEach(shape => {
            ctx.beginPath();
            switch (shape.type) {
                case 'circle':
                    ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
                    break;
                case 'square':
                    ctx.rect(shape.x - shape.size / 2, shape.y - shape.size / 2, shape.size, shape.size);
                    break;
                case 'triangle':
                    const k = Math.sqrt(3) / 2;
                    ctx.moveTo(shape.x - shape.size / 2, shape.y + k * shape.size / 2);
                    ctx.lineTo(shape.x + shape.size / 2, shape.y + k * shape.size / 2);
                    ctx.lineTo(shape.x, shape.y - k * shape.size / 2);
                    ctx.closePath();
                    break;
            }
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fill();
        });


        render(start, angle, maxDistance, minDistance);
    }
    // Draw intersection points
    drawIntersectionPoints();
});


// All Listeners

window.addEventListener("mousemove", handleMouseMove);

window.addEventListener("keydown", (e) => {
    if (e.key === "r" || e.key === "R") {
        shapes = generateRandomShapes(Math.random() * 5 + 5);
        intersectionPoints = [];
    }
});

window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
        console.log("HERE")
        rotationSpeed += 0.001;
    }
    else if (e.key === "ArrowDown") {
        rotationSpeed -= 0.001;
    }
});

window.onload = () => {
    updateSpinningAngle()
}

document.getElementById("playButton").addEventListener("click", (e) => {
    isPlaying = !isPlaying;

    spinningAngle = Math.atan2(mouseY - canvas.height / 2, mouseX - canvas.width / 2);
    const svgElement = document.querySelector("svg"); // Add this line
    if (isPlaying) {
        svgElement.innerHTML = '<path d="M208 432h-48a16 16 0 01-16-16V96a16 16 0 0116-16h48a16 16 0 0116 16v320a16 16 0 01-16 16zM352 432h-48a16 16 0 01-16-16V96a16 16 0 0116-16h48a16 16 0 0116 16v320a16 16 0 01-16 16z"/>';
        updateSpinningAngle();
    } else {
        svgElement.innerHTML = '<path d="M133 440a35.37 35.37 0 01-17.5-4.67c-12-6.8-19.46-20-19.46-34.33V111c0-14.37 7.46-27.53 19.46-34.33a35.13 35.13 0 0135.77.45l247.85 148.36a36 36 0 010 61l-247.89 148.4A35.5 35.5 0 01133 440z"/>';
        handleMouseMove({ clientX: mouseX + canvas.getBoundingClientRect().left, clientY: mouseY + canvas.getBoundingClientRect().top });
    }
});
