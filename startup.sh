#!/bin/sh
### BEGIN INIT INFO
# Provides:          DDNSupdater
# Required-start:    $local_fs $network
# Required-stop:     $local_fs $network
# Default-start:     2 3 4 5
# Default-stop:      0 1 6
### END INIT INFO
cd /usr/local/bin/DDNSupdater
LOCK=/run/lock/DDNSupdater
test -x $DAEMON || exit 0
case "$1" in
start)
npm run start
touch $LOCK
;;
stop)
npm run stop
ps aux | grep "nodejs DDNSupdater.js" | awk '{print $2}' | xargs kill
rm $LOCK
;;
restart)
npm run stop
rm $LOCK
npm run start
touch $LOCK
;;
*)
echo "Usage: $0 {start|stop|restart}"
exit 1
esac
exit 0
