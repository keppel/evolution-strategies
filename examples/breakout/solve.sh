node worker.js BipedalWalker-v2 render &

for run in {1..5}
do
  node worker.js BipedalWalker-v2  &
done
