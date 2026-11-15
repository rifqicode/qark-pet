#!/usr/bin/env bash
# Launches the pet as the notification server. When the pet exits for any reason (including kill -9),
# make sure a notification daemon owns the bus name again so system notifications don't stay dead.
cd "$(dirname "$0")/.." || exit 1
PET_OWN_NOTIFY=1 node_modules/.bin/electron . --no-sandbox
sleep 1
has_owner=$(gdbus call --session --dest org.freedesktop.DBus --object-path /org/freedesktop/DBus \
  --method org.freedesktop.DBus.NameHasOwner org.freedesktop.Notifications 2>/dev/null)
case "$has_owner" in
  *true*) ;;
  *) nohup io.elementary.notifications >/dev/null 2>&1 & ;;
esac
