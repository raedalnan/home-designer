# Home Designer

Home Designer is an interactive browser-based 3D room planner. It lets users shape a room, divide it with interior walls, add doors and windows, choose finishes, and arrange furniture on a collision-aware grid.

I designed and built this project myself. I used artificial intelligence as a development tool to accelerate research, iteration, debugging, and implementation, while retaining responsibility for the product direction and final result.

## Features

- Interactive orbiting 3D room view
- Adjustable room width and depth
- Grid-snapped furniture placement, movement, and rotation
- Interior wall drawing with collision prevention
- Camera-aware exterior walls that fade when they obstruct the view
- Wall-attached door and window variations
- Wall and floor color palettes
- Collision checks between furniture, walls, and openings
- Locally persisted layouts
- Responsive desktop, tablet, and mobile interface
- Asset-loading progress screen

## Technology

- React 19
- React Three Fiber and Three.js
- Drei
- Vite
- Tailwind CSS

## Run locally

Requirements: Node.js 18 or newer and npm.

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

Preview the production build with:

```bash
npm run preview
```

## Controls

- Drag outside the room floor to orbit the camera.
- Select furniture to move, rotate, or delete it.
- Use **Walls** mode and drag across the floor grid to draw a wall.
- Use **Openings** mode, select a door or window, then click a compatible wall.
- Select an interior wall or opening to delete it.
- Press `R` to rotate selected furniture.
- Press `Delete` or `Backspace` to remove the selected element.

Layouts are stored in the browser's local storage.

## Asset credit

The furniture models are based on [Low Poly Furnitures Full Bundle](https://skfb.ly/oLwUo) by Taha Kaya, licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). The original pack was modified by splitting it into individual pieces and rescaling the models for this application.
