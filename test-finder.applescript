tell application "Finder"
    activate
    make new Finder window
    set the target of window 1 to computer
    delay 0.5
end tell

tell application "System Events"
    tell process "Finder"
        click menu item "Find" of menu "File" of menu bar 1
        delay 0.5
        keystroke "a" using command down
        keystroke "test-search"
        delay 0.2
        click button "Search This Mac" of window 1
    end tell
end tell
