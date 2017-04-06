node worker.js CartPole-v0 render &

for run in {1..10}
do
  node worker.js CartPole-v0 &
done

node master.js
