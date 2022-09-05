session=game
if ! tmux has-session -t $session; then
    tmux new-session -s $session -d
    tmux rename-window -t $session:1 code
    tmux new-window -t $session:2 -n test
    tmux new-window -t $session:3 -n run
    tmux send-keys -t $session:1 vim Enter
    tmux send-keys -t $session:3.0 "npm run dev" Enter
    tmux select-window -t $session:1
fi
tmux attach -t $session
