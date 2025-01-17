tell application "Finder"
    activate
    make new Finder window
    delay 0.5
end tell

tell application "System Events"
    keystroke "f" using command down
    delay 0.5
    keystroke "test-search"
    delay 0.2
    key code 36 -- Press return/enter key
end tell
