﻿function newAAMastersPlottersBollingerBandsPercentageBandwidth() {

    const MODULE_NAME = "Bands Plotter";
    const INFO_LOG = false;
    const ERROR_LOG = true;
    const INTENSIVE_LOG = false;
    const logger = newWebDebugLog();
    logger.fileName = MODULE_NAME;

    let thisObject = {

        // Main functions and properties.

        initialize: initialize,
        container: undefined,
        getContainer: getContainer,
        setTimePeriod: setTimePeriod,
        setDatetime: setDatetime,
        draw: draw,
        recalculateScale: recalculateScale,

        /* Events declared outside the plotter. */

        onDailyFileLoaded: onDailyFileLoaded,

        // Secondary functions and properties.

        currentPercentageBandwidth: undefined
    };

    /* this is part of the module template */

    let container = newContainer();     // Do not touch this 3 lines, they are just needed.
    container.initialize();
    thisObject.container = container;

    let plotAreaFrame = newTimeLineCoordinateSystem();  // Used for full frame view.
    let plotAreaViewport = newTimeLineCoordinateSystem();  // Used for viewport view.

    let timePeriod;                     // This will hold the current Time Period the user is at.
    let datetime;                       // This will hold the current Datetime the user is at.

    let marketFile;                     // This is the current Market File being plotted.
    let fileCursor;                     // This is the current File Cursor being used to retrieve Daily Files.

    let marketFiles;                      // This object will provide the different Market Files at different Time Periods.
    let dailyFiles;                // This object will provide the different File Cursors at different Time Periods.

    /* these are module specific variables: */

    let percentageBandwidthArray = [];                   // Here we keep the percentageBandwidthArray to be ploted every time the Draw() function is called by the AAWebPlatform.

    return thisObject;

    function initialize(pStorage, pExchange, pMarket, pDatetime, pTimePeriod, callBackFunction) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] initialize -> Entering function."); }

            /* Store the information received. */

            marketFiles = pStorage.marketFiles[0];
            dailyFiles = pStorage.dailyFiles[0];

            datetime = pDatetime;
            timePeriod = pTimePeriod;

            /* We need a Market File in order to calculate the Y scale, since this scale depends on actual data. */

            marketFile = marketFiles.getFile(ONE_DAY_IN_MILISECONDS);  // This file is the one processed faster. 

            recalculateScaleY();
            recalculateScaleX();

            /* Now we set the right files according to current Period. */

            marketFile = marketFiles.getFile(pTimePeriod);
            fileCursor = dailyFiles.getFileCursor(pTimePeriod);

            /* Listen to the necesary events. */

            viewPort.eventHandler.listenToEvent("Zoom Changed", onZoomChanged);
            viewPort.eventHandler.listenToEvent("Offset Changed", onOffsetChanged);
            marketFiles.eventHandler.listenToEvent("Files Updated", onFilesUpdated);
            canvas.eventHandler.listenToEvent("Drag Finished", onDragFinished);

            /* Get ready for plotting. */

            recalculate();

            callBackFunction();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] initialize -> err.message = " + err.message); }
        }
    }

    function recalculateScale() {

        recalculateScaleY();
        recalculateScaleX();

    }

    function getContainer(point) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] getContainer -> Entering function."); }

            let container;

            /* First we check if this point is inside this space. */

            if (this.container.frame.isThisPointHere(point) === true) {

                return this.container;

            } else {

                /* This point does not belong to this space. */

                return undefined;
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] getContainer -> err.message = " + err.message); }
        }
    }

    function onFilesUpdated() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onFilesUpdated -> Entering function."); }

            let newMarketFile = marketFiles.getFile(timePeriod);

            if (newMarketFile !== undefined) {

                marketFile = newMarketFile;
                recalculate();
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onFilesUpdated -> err.message = " + err.message); }
        }
    }

    function setTimePeriod(pTimePeriod) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] setTimePeriod -> Entering function."); }

            if (timePeriod !== pTimePeriod) {

                timePeriod = pTimePeriod;

                if (timePeriod >= _1_HOUR_IN_MILISECONDS) {

                    let newMarketFile = marketFiles.getFile(pTimePeriod);

                    if (newMarketFile !== undefined) {

                        marketFile = newMarketFile;
                        recalculate();
                    }

                } else {

                    let newFileCursor = dailyFiles.getFileCursor(pTimePeriod);

                    if (newFileCursor !== undefined) {

                        fileCursor = newFileCursor;
                        recalculate();
                    }
                }
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] setTimePeriod -> err.message = " + err.message); }
        }
    }

    function setDatetime(pDatetime) {

        if (INFO_LOG === true) { logger.write("[INFO] setDatetime -> Entering function."); }

        datetime = pDatetime;

    }

    function onDailyFileLoaded(event) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onDailyFileLoaded -> Entering function."); }

            if (event.currentValue === event.totalValue) {

                /* This happens only when all of the files in the cursor have been loaded. */

                recalculate();

            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onDailyFileLoaded -> err.message = " + err.message); }
        }
    }

    function draw() {

        try {

            if (INTENSIVE_LOG === true) { logger.write("[INFO] draw -> Entering function."); }

            this.container.frame.draw();

            plotChart();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] draw -> err.message = " + err.message); }
        }
    }

    function recalculate() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculate -> Entering function."); }

            if (timePeriod >= _1_HOUR_IN_MILISECONDS) {

                recalculateUsingMarketFiles();

            } else {

                recalculateUsingDailyFiles();

            }

            thisObject.container.eventHandler.raiseEvent("Bands Changed", percentageBandwidthArray);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculate -> err.message = " + err.message); }
        }
    }

    function recalculateUsingDailyFiles() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculateUsingDailyFiles -> Entering function."); }

            if (fileCursor === undefined) { return; } // We need to wait

            if (fileCursor.files.size === 0) { return; } // We need to wait until there are files in the cursor

            let daysOnSides = getSideDays(timePeriod);

            let leftDate = getDateFromPoint(viewPort.visibleArea.topLeft, thisObject.container, plotAreaFrame);
            let rightDate = getDateFromPoint(viewPort.visibleArea.topRight, thisObject.container, plotAreaFrame);

            let dateDiff = rightDate.valueOf() - leftDate.valueOf();

            let farLeftDate = new Date(leftDate.valueOf() - dateDiff * 1.5);
            let farRightDate = new Date(rightDate.valueOf() + dateDiff * 1.5);

            let currentDate = new Date(farLeftDate.valueOf());

            percentageBandwidthArray = [];

            while (currentDate.valueOf() <= farRightDate.valueOf() + ONE_DAY_IN_MILISECONDS) {

                let stringDate = currentDate.getFullYear() + '-' + pad(currentDate.getMonth() + 1, 2) + '-' + pad(currentDate.getDate(), 2);

                let dailyFile = fileCursor.files.get(stringDate);

                if (dailyFile !== undefined) {

                    for (let i = 0; i < dailyFile.length; i++) {

                        let percentageBandwidth = {
                            begin: undefined,
                            end: undefined,
                            value: undefined,
                            movingAverage: undefined,
                            bandwidth: undefined
                        };

                        percentageBandwidth.begin = dailyFile[i][0];
                        percentageBandwidth.end = dailyFile[i][1];
                        percentageBandwidth.value = dailyFile[i][2];
                        percentageBandwidth.movingAverage = dailyFile[i][3];
                        percentageBandwidth.bandwidth = dailyFile[i][4];

                        if (percentageBandwidth.begin >= farLeftDate.valueOf() && percentageBandwidth.end <= farRightDate.valueOf()) {

                            percentageBandwidthArray.push(percentageBandwidth);

                            if (datetime.valueOf() >= percentageBandwidth.begin && datetime.valueOf() <= percentageBandwidth.end) {

                                thisObject.currentPercentageBandwidth = percentageBandwidth;
                                thisObject.container.eventHandler.raiseEvent("Current Percentage Bandwidth Changed", thisObject.currentPercentageBandwidth);

                            }
                        }
                    }
                }

                currentDate = new Date(currentDate.valueOf() + ONE_DAY_IN_MILISECONDS);
            }

            /* Lests check if all the visible screen is going to be covered by percentageBandwidthArray. */

            let lowerEnd = leftDate.valueOf();
            let upperEnd = rightDate.valueOf();

            if (percentageBandwidthArray.length > 0) {

                if (percentageBandwidthArray[0].begin > lowerEnd || percentageBandwidthArray[percentageBandwidthArray.length - 1].end < upperEnd) {

                    setTimeout(recalculate, 2000);

                    //console.log("File missing while calculating percentageBandwidthArray, scheduling a recalculation in 2 seconds.");

                }
            }

            //console.log("Olivia > recalculateUsingDailyFiles > total percentageBandwidthArray generated : " + percentageBandwidthArray.length);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateUsingDailyFiles -> err.message = " + err.message); }
        }
    }

    function recalculateUsingMarketFiles() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculateUsingMarketFiles -> Entering function."); }

            if (marketFile === undefined) { return; } // Initialization not complete yet.

            let daysOnSides = getSideDays(timePeriod);

            let leftDate = getDateFromPoint(viewPort.visibleArea.topLeft, thisObject.container, plotAreaFrame);
            let rightDate = getDateFromPoint(viewPort.visibleArea.topRight, thisObject.container, plotAreaFrame);

            let dateDiff = rightDate.valueOf() - leftDate.valueOf();

            leftDate = new Date(leftDate.valueOf() - dateDiff * 1.5);
            rightDate = new Date(rightDate.valueOf() + dateDiff * 1.5);

            percentageBandwidthArray = [];

            for (let i = 0; i < marketFile.length; i++) {

                let percentageBandwidth = {
                    begin: undefined,
                    end: undefined,
                    value: undefined,
                    movingAverage: undefined,
                    bandwidth: undefined
                };

                percentageBandwidth.begin = marketFile[i][0];
                percentageBandwidth.end = marketFile[i][1];
                percentageBandwidth.value = marketFile[i][2];
                percentageBandwidth.movingAverage = marketFile[i][3];
                percentageBandwidth.bandwidth = marketFile[i][4];

                if (percentageBandwidth.begin >= leftDate.valueOf() && percentageBandwidth.end <= rightDate.valueOf()) {

                    percentageBandwidthArray.push(percentageBandwidth);

                    if (datetime.valueOf() >= percentageBandwidth.begin && datetime.valueOf() <= percentageBandwidth.end) {

                        thisObject.currentPercentageBandwidth = percentageBandwidth;
                        thisObject.container.eventHandler.raiseEvent("Current Percentage Bandwidth Changed", thisObject.currentPercentageBandwidth);

                    }
                }
            }

            //console.log("Olivia > recalculateUsingMarketFiles > total percentageBandwidthArray generated : " + percentageBandwidthArray.length);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateUsingMarketFiles -> err.message = " + err.message); }
        }
    }

    function recalculateScaleX() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculateScaleX -> Entering function."); }

            var minValue = {
                x: EARLIEST_DATE.valueOf()
            };

            var maxValue = {
                x: MAX_PLOTABLE_DATE.valueOf()
            };

            plotAreaViewport.initializeX(
                minValue,
                maxValue,
                thisObject.container.frame.width
            );

            plotAreaFrame.initializeX(
                minValue,
                maxValue,
                thisObject.container.frame.width
            );

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateScaleX -> err.message = " + err.message); }
        }
    }

    function recalculateScaleY() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculateScaleY -> Entering function."); }

            var minValue = {
                y: 0
            };

            var maxValue = {
                y: 0
            };

            maxValue.y = 100;

            plotAreaViewport.initializeY(
                minValue,
                maxValue,
                viewPort.visibleArea.bottomRight.y - viewPort.visibleArea.topLeft.y
            );

            plotAreaFrame.initializeY(
                minValue,
                maxValue,
                thisObject.container.frame.height
            );

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateScaleY -> err.message = " + err.message); }
        }
    }


    function plotChart() {

        try {

            if (INTENSIVE_LOG === true) { logger.write("[INFO] plotChart -> Entering function."); }

            let percentageBandwidth;
            let previousBand;

            if (percentageBandwidthArray.length > 0) {

                /* This next section is to get ready in order to be able to plot dinamically constrained to the viewport */

                let visibleHeight = viewPort.visibleArea.bottomRight.y - viewPort.visibleArea.topLeft.y;

                let frameCorner1 = {
                    x: 0,
                    y: 0
                };

                let frameCorner2 = {
                    x: thisObject.container.frame.width,
                    y: thisObject.container.frame.height
                };

                /* Now the transformations. */

                frameCorner1 = transformThisPoint(frameCorner1, thisObject.container.frame.container);
                frameCorner2 = transformThisPoint(frameCorner2, thisObject.container.frame.container);

                let frameHeightInViewPort = frameCorner2.y - frameCorner1.y;
                let pbChartHeight = 20;
                let pbOffset = 100 / 5 * 4;

                /* Now we calculate and plot the percentageBandwidthArray */

                for (let i = 1; i < percentageBandwidthArray.length; i++) {

                    percentageBandwidth = percentageBandwidthArray[i];
                    previousBand = percentageBandwidthArray[i - 1];

                    /* Here we will draw the percent bandwidth chart */

                    let currentPercentBandwidth = percentageBandwidth.value * pbChartHeight / 100;
                    if (currentPercentBandwidth > pbChartHeight) { currentPercentBandwidth = pbChartHeight };
                    if (currentPercentBandwidth < 0) { currentPercentBandwidth = 0 };

                    let previousPercentBandwidth = previousBand.value * pbChartHeight / 100;
                    if (previousPercentBandwidth > pbChartHeight) { previousPercentBandwidth = pbChartHeight };
                    if (previousPercentBandwidth < 0) { previousPercentBandwidth = 0 };

                    let currentMovingAverage = percentageBandwidth.movingAverage * pbChartHeight / 100;
                    let previousMovingAverage = previousBand.movingAverage * pbChartHeight / 100;

                    let currentBandwidth = percentageBandwidth.bandwidth * 100 * pbChartHeight / 100;
                    let previousBandwidth = previousBand.bandwidth * 100 * pbChartHeight / 100;

                    let pbPoint1;
                    let pbPoint2;
                    let pbPoint3;
                    let pbPoint4;
                    let pbPoint5;
                    let pbPoint6;
                    let pbPoint7;
                    let pbPoint8;
                    let pbPoint9;
                    let pbPoint10;

                    function calculateCoordinates(plot, height) {

                        pbPoint1 = {
                            x: percentageBandwidth.begin,
                            y: previousPercentBandwidth + pbOffset
                        };

                        pbPoint2 = {
                            x: percentageBandwidth.end,
                            y: currentPercentBandwidth + pbOffset
                        };

                        /* Points needed for the lines */

                        pbPoint3 = {
                            x: 0,
                            y: 0 * pbChartHeight / 100 + pbOffset
                        };

                        pbPoint4 = {
                            x: 0,
                            y: 30 * pbChartHeight / 100 + pbOffset
                        };

                        pbPoint5 = {
                            x: 0,
                            y: 70 * pbChartHeight / 100 + pbOffset
                        };

                        pbPoint6 = {
                            x: 0,
                            y: 100 * pbChartHeight / 100 + pbOffset
                        };

                        /* Moving Average */

                        pbPoint7 = {
                            x: percentageBandwidth.begin,
                            y: previousMovingAverage + pbOffset
                        };

                        pbPoint8 = {
                            x: percentageBandwidth.end,
                            y: currentMovingAverage + pbOffset
                        };

                        /* Bandwidth */

                        pbPoint9 = {
                            x: percentageBandwidth.begin,
                            y: previousBandwidth + pbOffset
                        };

                        pbPoint10 = {
                            x: percentageBandwidth.end,
                            y: currentBandwidth + pbOffset
                        };

                        pbPoint1 = plot.transformThisPoint(pbPoint1);
                        pbPoint2 = plot.transformThisPoint(pbPoint2);

                        pbPoint3 = plot.transformThisPoint(pbPoint3);
                        pbPoint4 = plot.transformThisPoint(pbPoint4);
                        pbPoint5 = plot.transformThisPoint(pbPoint5);
                        pbPoint6 = plot.transformThisPoint(pbPoint6);

                        pbPoint7 = plot.transformThisPoint(pbPoint7);
                        pbPoint8 = plot.transformThisPoint(pbPoint8);

                        pbPoint9 = plot.transformThisPoint(pbPoint9);
                        pbPoint10 = plot.transformThisPoint(pbPoint10);

                        pbPoint1 = transformThisPoint(pbPoint1, thisObject.container);
                        pbPoint2 = transformThisPoint(pbPoint2, thisObject.container);

                        pbPoint3 = transformThisPoint(pbPoint3, thisObject.container);
                        pbPoint4 = transformThisPoint(pbPoint4, thisObject.container);
                        pbPoint5 = transformThisPoint(pbPoint5, thisObject.container);
                        pbPoint6 = transformThisPoint(pbPoint6, thisObject.container);

                        pbPoint7 = transformThisPoint(pbPoint7, thisObject.container);
                        pbPoint8 = transformThisPoint(pbPoint8, thisObject.container);

                        pbPoint9 = transformThisPoint(pbPoint9, thisObject.container);
                        pbPoint10 = transformThisPoint(pbPoint10, thisObject.container);

                        if (pbPoint1.x < viewPort.visibleArea.bottomLeft.x || pbPoint2.x > viewPort.visibleArea.bottomRight.x) {
                            return false;
                        }

                        return true;

                    }

                    if (calculateCoordinates(plotAreaFrame, thisObject.container.frame.height) === false) { continue; } // We try to see if it fits in the visible area.

                    if (frameHeightInViewPort > visibleHeight * 2 / 3) {

                        if (calculateCoordinates(plotAreaViewport, visibleHeight) === false) {
                            continue;
                        }  // We snap t to the view port.

                        /* Now we set the real value of y. */

                        pbPoint1.y = viewPort.visibleArea.bottomRight.y - (previousPercentBandwidth + pbOffset) * plotAreaViewport.scale.y;
                        pbPoint2.y = viewPort.visibleArea.bottomRight.y - (currentPercentBandwidth + pbOffset) * plotAreaViewport.scale.y;

                        pbPoint3.y = viewPort.visibleArea.bottomRight.y - (0 * pbChartHeight / 100 + pbOffset) * plotAreaViewport.scale.y;
                        pbPoint4.y = viewPort.visibleArea.bottomRight.y - (30 * pbChartHeight / 100 + pbOffset) * plotAreaViewport.scale.y;
                        pbPoint5.y = viewPort.visibleArea.bottomRight.y - (70 * pbChartHeight / 100 + pbOffset) * plotAreaViewport.scale.y;
                        pbPoint6.y = viewPort.visibleArea.bottomRight.y - (100 * pbChartHeight / 100 + pbOffset) * plotAreaViewport.scale.y;

                        pbPoint7.y = viewPort.visibleArea.bottomRight.y - (previousMovingAverage + pbOffset) * plotAreaViewport.scale.y;
                        pbPoint8.y = viewPort.visibleArea.bottomRight.y - (currentMovingAverage + pbOffset) * plotAreaViewport.scale.y;

                        pbPoint9.y = viewPort.visibleArea.bottomRight.y - (previousBandwidth + pbOffset) * plotAreaViewport.scale.y;
                        pbPoint10.y = viewPort.visibleArea.bottomRight.y - (currentBandwidth + pbOffset) * plotAreaViewport.scale.y;

                    }

                    /* Everything must fit within the visible area */

                    pbPoint1 = viewPort.fitIntoVisibleArea(pbPoint1);
                    pbPoint2 = viewPort.fitIntoVisibleArea(pbPoint2);

                    pbPoint3 = viewPort.fitIntoVisibleArea(pbPoint3);
                    pbPoint4 = viewPort.fitIntoVisibleArea(pbPoint4);
                    pbPoint5 = viewPort.fitIntoVisibleArea(pbPoint5);
                    pbPoint6 = viewPort.fitIntoVisibleArea(pbPoint6);

                    pbPoint7 = viewPort.fitIntoVisibleArea(pbPoint7);
                    pbPoint8 = viewPort.fitIntoVisibleArea(pbPoint8);

                    pbPoint9 = viewPort.fitIntoVisibleArea(pbPoint9);
                    pbPoint10 = viewPort.fitIntoVisibleArea(pbPoint10);


                    /* Now the drawing of the lines */

                    let bgOpacityA = 0.05;
                    let bgOpacityB = 0.05;
                    let bgOpacityC = 0.05;

                    let fgOpacity = '1';

                    let lineWidthA = 0.2;
                    let lineWidthB = 0.2;
                    let lineWidthC = 0.2;

                    if (pbPoint1.y > pbPoint4.y || pbPoint2.y > pbPoint4.y) {
                        bgOpacityA = bgOpacityA * 2;
                    }

                    if (pbPoint1.y < pbPoint5.y || pbPoint2.y < pbPoint5.y) {
                        bgOpacityC = bgOpacityC * 2;
                    }

                    if (pbPoint1.y >= pbPoint3.y || pbPoint2.y >= pbPoint3.y) {
                        bgOpacityA = bgOpacityA * 1.5;
                        lineWidthA = lineWidthA * 2;
                    }

                    if (pbPoint1.y <= pbPoint6.y || pbPoint2.y <= pbPoint6.y) {
                        bgOpacityC = bgOpacityC * 1.5;
                        lineWidthC = lineWidthC * 2;
                    }

                    browserCanvasContext.beginPath();

                    browserCanvasContext.moveTo(pbPoint1.x, pbPoint3.y);
                    browserCanvasContext.lineTo(pbPoint2.x, pbPoint3.y);
                    browserCanvasContext.lineTo(pbPoint2.x, pbPoint4.y);
                    browserCanvasContext.lineTo(pbPoint1.x, pbPoint4.y);

                    browserCanvasContext.closePath();

                    browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.GOLDEN_ORANGE + ',' + bgOpacityA + ' )';
                    browserCanvasContext.fill();

                    browserCanvasContext.beginPath();

                    browserCanvasContext.moveTo(pbPoint1.x, pbPoint4.y);
                    browserCanvasContext.lineTo(pbPoint2.x, pbPoint4.y);
                    browserCanvasContext.lineTo(pbPoint2.x, pbPoint5.y);
                    browserCanvasContext.lineTo(pbPoint1.x, pbPoint5.y);

                    browserCanvasContext.closePath();

                    browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.TITANIUM_YELLOW + ', ' + bgOpacityB + ')';
                    browserCanvasContext.fill();

                    browserCanvasContext.beginPath();

                    browserCanvasContext.moveTo(pbPoint1.x, pbPoint5.y);
                    browserCanvasContext.lineTo(pbPoint2.x, pbPoint5.y);
                    browserCanvasContext.lineTo(pbPoint2.x, pbPoint6.y);
                    browserCanvasContext.lineTo(pbPoint1.x, pbPoint6.y);

                    browserCanvasContext.closePath();

                    browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.GOLDEN_ORANGE + ', ' + bgOpacityC + ')';
                    browserCanvasContext.fill();

                    browserCanvasContext.beginPath();

                    browserCanvasContext.moveTo(pbPoint1.x, pbPoint3.y);
                    browserCanvasContext.lineTo(pbPoint2.x, pbPoint3.y);

                    browserCanvasContext.closePath();

                    browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.GOLDEN_ORANGE + ', ' + fgOpacity + ')';
                    browserCanvasContext.lineWidth = lineWidthA;
                    browserCanvasContext.stroke();

                    browserCanvasContext.beginPath();

                    browserCanvasContext.moveTo(pbPoint1.x, pbPoint4.y);
                    browserCanvasContext.lineTo(pbPoint2.x, pbPoint4.y);
                    browserCanvasContext.moveTo(pbPoint1.x, pbPoint5.y);
                    browserCanvasContext.lineTo(pbPoint2.x, pbPoint5.y);

                    browserCanvasContext.closePath();

                    browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.GOLDEN_ORANGE + ', ' + fgOpacity + ')';
                    browserCanvasContext.lineWidth = lineWidthB;
                    browserCanvasContext.stroke();

                    browserCanvasContext.beginPath();

                    browserCanvasContext.moveTo(pbPoint1.x, pbPoint6.y);
                    browserCanvasContext.lineTo(pbPoint2.x, pbPoint6.y);

                    browserCanvasContext.closePath();

                    browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.GOLDEN_ORANGE + ', ' + fgOpacity + ')';
                    browserCanvasContext.lineWidth = lineWidthC;
                    browserCanvasContext.stroke();

                    /* Now the drawing of the percentage bandwidth*/

                    browserCanvasContext.beginPath();

                    browserCanvasContext.moveTo(pbPoint1.x, pbPoint1.y);
                    browserCanvasContext.lineTo(pbPoint2.x, pbPoint2.y);

                    browserCanvasContext.closePath();


                    if (datetime !== undefined) {

                        let dateValue = datetime.valueOf();

                        if (dateValue >= percentageBandwidth.begin && dateValue <= percentageBandwidth.end) {
                            browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.TITANIUM_YELLOW + ', 1)';
                        } else {
                            browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.GOLDEN_ORANGE + ', 1)';
                        }
                    } else {
                        browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.GOLDEN_ORANGE + ', 1)';
                    }

                    browserCanvasContext.lineWidth = 0.2;
                    browserCanvasContext.stroke();

                    /* Now the drawing of the moving average*/

                    browserCanvasContext.beginPath();

                    browserCanvasContext.moveTo(pbPoint7.x, pbPoint7.y);
                    browserCanvasContext.lineTo(pbPoint8.x, pbPoint8.y);

                    browserCanvasContext.closePath();

                    if (pbPoint7.y > pbPoint8.y) {
                        browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.PATINATED_TURQUOISE + ', 1)';
                    } else {
                        browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.RUSTED_RED + ', 1)';
                    }

                    if (datetime !== undefined) {

                        let dateValue = datetime.valueOf();

                        if (dateValue >= percentageBandwidth.begin && dateValue <= percentageBandwidth.end) {
                            browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.TITANIUM_YELLOW + ', 1)';
                        }
                    }

                    browserCanvasContext.lineWidth = 0.2;
                    browserCanvasContext.stroke();

                    /* Now the drawing of the bandwidth*/

                    browserCanvasContext.beginPath();

                    browserCanvasContext.moveTo(pbPoint9.x, pbPoint9.y);
                    browserCanvasContext.lineTo(pbPoint10.x, pbPoint10.y);

                    browserCanvasContext.closePath();

                    browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.GREEN + ', 1)';

                    if (datetime !== undefined) {

                        let dateValue = datetime.valueOf();

                        if (dateValue >= percentageBandwidth.begin && dateValue <= percentageBandwidth.end) {
                            browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.TITANIUM_YELLOW + ', 1)';
                        }
                    }

                    browserCanvasContext.setLineDash([1, 4])
                    browserCanvasContext.lineWidth = 1
                    browserCanvasContext.stroke()
                    browserCanvasContext.setLineDash([0, 0])
                }
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] plotChart -> err.message = " + err.message); }
        }
    }


    function onZoomChanged(event) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onZoomChanged -> Entering function."); }

            recalculate();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onZoomChanged -> err.message = " + err.message); }
        }
    }

    function onOffsetChanged() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onOffsetChanged -> Entering function."); }

            if (Math.random() * 100 > 95) {

                recalculate()
            };

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onOffsetChanged -> err.message = " + err.message); }
        }
    }

    function onDragFinished() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onDragFinished -> Entering function."); }

            recalculate();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onDragFinished -> err.message = " + err.message); }
        }
    }
}

