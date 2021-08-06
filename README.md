# title

## Solution

The solution done in the allotted time is fairly simple:

- get the tile at some zoom at some lon lat
- get the bounding box for the tile
- create a plane geometry with `textureSize - 1` segments (`textureSize` vertices)
- create a shader that reads the texture
  - UV is scaled by `511/512` and translated by `0.5/512` to align the center of the pixel to the vertex
  - height is unpacked using the formula
  - height is applied in world space
  - normals are computed from neigboring vertices using the texture
  - height is normalized using the height range obtained from the texture
- scale the mesh in the horizontal plane by the size of the bounding box
- fetch the texture
  - find height range 
  - assign to material


## Problems

- Aligning different zooms using bounding boxes failed. 
- I dont understand how the first zoom level relates to the rest of the tiles since its aspect ratio is very skinny 
  - Higher zoom levels converge to aspect of 1, but the very next is much closer to 1 (first is 2-3?)
  