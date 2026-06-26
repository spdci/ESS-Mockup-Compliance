#!/bin/sh 
#!/bin/bash

mockoon-cli start \
--hostname 0.0.0.0 \
--data mockoon-ess.json \
--container &

mockoon-cli start \
--hostname 0.0.0.0 \
--data mockoon-sp.json \
--container &

wait 