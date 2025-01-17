tell application "Finder"
    activate
    make new Finder window
    set the target of the front Finder window to computer
    set the current view of the front Finder window to list view
    set the search target of the front Finder window to computer
    set the search text of the front Finder window to "test-image"
end tell
