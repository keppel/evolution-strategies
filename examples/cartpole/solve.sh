node worker.js CartPole-v0 render &

for run in {1..30}
do
  node worker.js CartPole-v0  &
done
