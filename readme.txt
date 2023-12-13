This app uses drag and drop features of HTML to move the pieces of a puzzle around. Bootstrap was integrated
so that the layout of the app would look good on desktops, tablets, and phones, but unfortunately the drag and
drop functionality doesn't work well on android phones or tablets (I have no Apple devices with which to test
the app). On my android phone it doesn't work at all and on my android tablet it works after a long press, but
a browser dialog box also comes up (tested using Chrome browser). I'll continue looking into ways of making this
work in an Android environment, but for the present the app should be considered functional for desktop uses
only. I'll likely replace the drag and drop functionality with 'click' functions - one click to choose the first
element to swap, and a second click to choose the second element.

The app also works only for bmp files; adding .jpg or .png support posed too many challenges to solve within the
timeframe available for submission of the project. I've added this to my TODO list after completion of the CS50
course.

The app checks the File.type property of the loaded file to verify that it is a bitmap. This property is not
supported on Chrome for Android (though it works fine on Chrome for Windows OS on desktop). I've rem'ed out these
checks (see lines 41 to 44, 64 to 67, and 260 to 263 in javascript.js) while I work on achieving functionality on
Android devices. Without these checks in place, the program still verifies that the file is a bitmap via lines
85 to 87.

The program uses the FileReader.readAsDataURL() function in a few locations. This is an asynchronous function, which
led to race-like conditions that drove be a bit mad for a while. Initially I had structured the program to call the
functions
    readImage() - which includes a call to FileReader.readAsDataURL(),
    divideImage() - which also includes a call to FileReader.readAsDataURL(), and
    scrambleImage()
sequentially in the "drop" event listeners for the largeDiv and dropBox elements of the document, however this was causing
issues associated with the asynchronous function calls (basically, scrambleImage() wasn't working as expected). I worked
around this issue by "chaining" the functions, such that readImage() calls divideImage() from within the "load" event
listener on its FileReader object. divideImage() does the same, calling scrambleImage() from within the "load" event
listener on its FileReader object. This may or may not be the correct way to properly fix the problem - I looked into awaits
and promises, but figuring out how to use these (or even whether these could fix the issue) seemed a bit too much of a topic
to research within the time I had available to complete the project.
