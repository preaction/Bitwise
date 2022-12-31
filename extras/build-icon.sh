#!/bin/bash

convert -background transparent "icon.png" -define icon:auto-resize=16,24,32,48,64,72,96,128,256 "icon.ico"
if [[ ! -d "icon.iconset" ]]; then
  mkdir icon.iconset
fi
cp icon.png icon.iconset/
cd icon.iconset
convert -resize 16x16 ../icon.png icon_16x16.png
convert -resize 32x32 ../icon.png icon_16x16@2x.png
convert -resize 32x32 ../icon.png icon_32x32.png
convert -resize 64x64 ../icon.png icon_32x32@2x.png
convert -resize 128x128 ../icon.png icon_128x128.png
convert -resize 256x256 ../icon.png icon_128x128@2x.png
convert -resize 256x256 ../icon.png icon_256x256.png
convert -resize 512x512 ../icon.png icon_256x256@2x.png
convert -resize 512x512 ../icon.png icon_512x512.png
convert -resize 1024x1024 ../icon.png icon_512x512@2x.png
cd ..
iconutil -c icns icon.iconset
