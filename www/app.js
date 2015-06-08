// Raj iPhone
//{uuid:'445A2A8B-5D25-4364-8300-B4A6E5088518'},
// JaaLee1
//{uuid:'EBEFD083-70A2-47C8-9837-E7B5634DF524'},

var app = (function()
{
	var servicesBaseUrl = 'http://parklifeservices.apphb.com/api/'
	var enterRegionBaseUrl = servicesBaseUrl + 'enterregion/';
	var exitRegionBaseUrl = servicesBaseUrl + 'exitregion/';
	var updateClosestBeaconUrl = servicesBaseUrl + 'signalupdateclosest/'

	// Application object.
	var app = {};

	// History of enter/exit events.
	var mRegionEvents = [];

	// Nearest ranged beacon.
	var mNearestBeacon = null;

	// Timer that displays nearby beacons.
	var mNearestBeaconDisplayTimer = null;

	// Background flag.
	var mAppInBackground = false;

	// Background notification id counter.
	var mNotificationId = 0;

	// Mapping of region event state names.
	// These are used in the event display string.
	var mRegionStateNames =
	{
		'CLRegionStateInside': 'Enter',
		'CLRegionStateOutside': 'Exit'
	};

	// Here monitored regions are defined.
	// TODO: Update with uuid/major/minor for your beacons.
	// You can add as many beacons as you want to use.
	var mRegions =
	[
		{
			id: 'GamesArea',
			uuid: '610D97BC-2DE1-499B-A1EB-6331235BF25C',
			major: 1,
			minor: 1
		},
		{
			id: 'Starbucks',
			uuid: '445A2A8B-5D25-4364-8300-B4A6E5088518',
			major: 1,
			minor: 1
		}
	];

	// Region data is defined here. Mapping used is from
	// region id to a string. You can adapt this to your
	// own needs, and add other data to be displayed.
	// TODO: Update with major/minor for your own beacons.
	var mRegionData =
	{
		'GamesArea': 'Games Area',
		'Starbucks': 'Starbucks'
	};

	var userId = 'Chris';

	function sendEnterRegion(regionId)
	{
		var urlToPost = enterRegionBaseUrl + regionId + "/" + userId;

		$.post(urlToPost, function(data) {
  			console.log('Successfully posted enter region ' + regionId);
		})
		.done(function() {
    		console.log('Done enter region ' + regionId);
  		})
  		.fail(function(jqXHR, textStatus, errorThrown) {
    		console.log('Fail enter region: ' + regionId + ', xhr: ' + jqXHR + ', textStatus: ' + textStatus + 'errorThrown: ' + errorThrown);
  		})
  		.always(function() {
    		console.log('Finished enter region ' + regionId);
		});
	}

	function sendExitRegion(regionId)
	{
		var urlToPost = exitRegionBaseUrl + regionId + "/" + userId;

		$.post(urlToPost, function(data) {
  			console.log('Successfully posted exit region ' + regionId);
		})
		.done(function() {
    		console.log('Done exit region ' + regionId);
  		})
  		.fail(function(jqXHR, textStatus, errorThrown) {
    		console.log('Fail exit region: ' + regionId + ', xhr: ' + jqXHR + ', textStatus: ' + textStatus + 'errorThrown: ' + errorThrown);
  		})
  		.always(function() {
    		console.log('Finished exit region ' + regionId);
		});
	}

	function sendNearestBeaconUpdate(beacon)
	{
		var regionId = getRegionIdForBeacon(beacon.uuid);
		var urlToPost = updateClosestBeaconUrl + regionId + "/" + userId + '/' + beacon.uuid + '/' + beacon.accuracy;

		console.log('sendingNearestBeaconUpdate to: ' + urlToPost);

		$.post(urlToPost, function(data) {
  			console.log('Successfully posted beacon update ' + regionId);
		})
		.done(function() {
    		console.log('Done beacon update ' + regionId);
  		})
  		.fail(function(jqXHR, textStatus, errorThrown) {
    		console.log('Fail beacon update: ' + regionId + ', xhr: ' + jqXHR + ', textStatus: ' + textStatus + 'errorThrown: ' + errorThrown);
  		})
  		.always(function() {
    		console.log('Finished beacon update ' + regionId);
		});
	}

	function transitionToMainView() {
		$('#loginPage').addClass('hidden');
		$('#mainPage').removeClass('hidden');

		var interval = setInterval(updateChat, 5000);

		var updateChat = function() {
    		$.get( "http://parklifeservices.apphb.com/api/getchat", function( data ) {

			})
		}
	}

	app.initialize = function()
	{
		console.log('App init');
 		document.addEventListener('deviceready', onDeviceReady, false);
		document.addEventListener('pause', onAppToBackground, false);
		document.addEventListener('resume', onAppToForeground, false);
		$(document).ready(function() {
			addEventHandlers();
		});
	};

	function addEventHandlers() 
	{
		$('#sign-in-button').click(function(e) {
			console.log('Sign-in clicked');
			e.preventDefault();
			transitionToMainView();
		});
	}

	function onDeviceReady()
	{
		console.log('onDeviceReady');
		startMonitoringAndRanging();
		startNearestBeaconDisplayTimer();
		displayRegionEvents();
	}

	function onAppToBackground()
	{
		console.log('onAppToBackground');
		mAppInBackground = true;
		stopNearestBeaconDisplayTimer();
	}

	function onAppToForeground()
	{
		console.log('onAppToForeground');
		mAppInBackground = false;
		startNearestBeaconDisplayTimer();
		displayRegionEvents();
	}

	function startNearestBeaconDisplayTimer()
	{
		mNearestBeaconDisplayTimer = setInterval(displayNearestBeacon, 1000);
	}

	function stopNearestBeaconDisplayTimer()
	{
		clearInterval(mNearestBeaconDisplayTimer);
		mNearestBeaconDisplayTimer = null;
	}

	function startMonitoringAndRanging()
	{
		function onDidDetermineStateForRegion(result)
		{
			if (result.state === 'CLRegionStateInside') {
				console.log('Entered a region ' + result.region.identifier);
				sendEnterRegion(result.region.identifier);
			} else if (result.state === 'CLRegionStateOutside') {
				console.log('Left region ' + result.region.identifier);
				sendExitRegion(result.region.identifier);
			}
			saveRegionEvent(result.state, result.region.identifier);
			displayRecentRegionEvent();
		}

		function onDidRangeBeaconsInRegion(result)
		{
			// result.beacons is list of 
			// { 
			//	'uuid' : 
			//  'accuracy' :
			//  'rssi' :
			// }

			var oldNearestBeacon = mNearestBeacon;
			updateNearestBeacon(result.beacons);
			if (!isSameBeacon(oldNearestBeacon, mNearestBeacon)) {
				if (!mNearestBeacon) {
					console.log('Nearest beacon unknown');
				} else {
					console.log('Nearest beacon is now: ' + mNearestBeacon.uuid);
					sendNearestBeaconUpdate(mNearestBeacon);
				}
			}
		}

		function onError(errorMessage)
		{
			console.log('Monitoring beacons did fail: ' + errorMessage);
		}

		// Request permission from user to access location info.
		cordova.plugins.locationManager.requestAlwaysAuthorization();

		// Create delegate object that holds beacon callback functions.
		var delegate = new cordova.plugins.locationManager.Delegate();
		cordova.plugins.locationManager.setDelegate(delegate);

		// Set delegate functions.
		delegate.didDetermineStateForRegion = onDidDetermineStateForRegion;
		delegate.didRangeBeaconsInRegion = onDidRangeBeaconsInRegion;

		// Start monitoring and ranging beacons.
		startMonitoringAndRangingRegions(mRegions, onError);
	}

	function startMonitoringAndRangingRegions(regions, errorCallback)
	{
		// Start monitoring and ranging regions.
		for (var i in regions)
		{
			startMonitoringAndRangingRegion(regions[i], errorCallback);
		}
	}

	function startMonitoringAndRangingRegion(region, errorCallback)
	{
		// Create a region object.
		var beaconRegion = new cordova.plugins.locationManager.BeaconRegion(
			region.id,
			region.uuid,
			region.major,
			region.minor);

		// Start ranging.
		cordova.plugins.locationManager.startRangingBeaconsInRegion(beaconRegion)
			.fail(errorCallback)
			.done();

		// Start monitoring.
		cordova.plugins.locationManager.startMonitoringForRegion(beaconRegion)
			.fail(errorCallback)
			.done();
	}

	function saveRegionEvent(eventType, regionId)
	{
		// Save event.
		mRegionEvents.push(
		{
			type: eventType,
			time: getTimeNow(),
			regionId: regionId
		});

		// Truncate if more than ten entries.
		if (mRegionEvents.length > 10)
		{
			mRegionEvents.shift();
		}
	}

	function getBeaconId(beacon)
	{
		return beacon.uuid + ':' + beacon.major + ':' + beacon.minor;
	}

	function isSameBeacon(beacon1, beacon2)
	{
		if (!beacon1 && !beacon2) return true;
		else if (!beacon1 && beacon2) return false;
		else if (beacon1 && !beacon2) return false;

		return getBeaconId(beacon1) == getBeaconId(beacon2);
	}

	function isNearerThan(beacon1, beacon2)
	{
		return beacon1.accuracy > 0
			&& beacon2.accuracy > 0
			&& beacon1.accuracy < beacon2.accuracy;
	}

	function updateNearestBeacon(beacons)
	{
		for (var i = 0; i < beacons.length; ++i)
		{
			var beacon = beacons[i];
			if (!mNearestBeacon)
			{
				mNearestBeacon = beacon;
			}
			else
			{
				if (isSameBeacon(beacon, mNearestBeacon) ||
					isNearerThan(beacon, mNearestBeacon))
				{
					mNearestBeacon = beacon;
				}
			}
		}
	}

	function getRegionIdForBeacon(uuid)
	{
		for (var i = 0; i < mRegions.length; i++)
		{
			if (mRegions[i].uuid.toUpperCase() === uuid.toUpperCase()) 
			{
				return mRegions[i].id;
			}
		}
		return null;
	}

	function displayNearestBeacon()
	{
		if (!mNearestBeacon) { return; }

		// Clear element.
		$('#beacon').empty();

		// Update element.
		var rId = getRegionIdForBeacon(mNearestBeacon.uuid);

		var element = $(
			'<li>'
			+	'<strong>' + getRegionData(rId) + '</strong><br />'
			+	'UUID: ' + mNearestBeacon.uuid + '<br />'
			+	'Distance: ' + mNearestBeacon.accuracy + 'm<br />'
			+	'RSSI: ' + mNearestBeacon.rssi + '<br />'
			+ '</li>'
			);
		$('#beacon').append(element);
	}

	function displayRecentRegionEvent()
	{
		if (mAppInBackground)
		{
			// Set notification title.
			var event = mRegionEvents[mRegionEvents.length - 1];
			if (!event) { return; }
			var title = getEventDisplayString(event);

			// Create notification.
			//cordova.plugins.notification.local.schedule({
    		//	id: ++mNotificationId,
    		//	title: title });
		}
		else
		{
			displayRegionEvents();
		}
	}

	function displayRegionEvents()
	{
		// Clear list.
		$('#events').empty();

		// Update list.
		for (var i = mRegionEvents.length - 1; i >= 0; --i)
		{
			var event = mRegionEvents[i];
			var title = getEventDisplayString(event);
			var element = $(
				'<li>'
				+ '<strong>' + title + '</strong>'
				+ '</li>'
				);
			$('#events').append(element);
		}

		// If the list is empty display a help text.
		if (mRegionEvents.length <= 0)
		{
			var element = $(
				'<li>'
				+ '<strong>'
				+	'Waiting for region events, please move into or out of a beacon region.'
				+ '</strong>'
				+ '</li>'
				);
			$('#events').append(element);
		}
	}

	function getRegionData(regionId)
	{
		return mRegionData[regionId];
	}

	function getEventDisplayString(event)
	{
		return event.time + ': '
			+ mRegionStateNames[event.type] + ' '
			+ getRegionData(event.regionId);
	}

	function getTimeNow()
	{
		function pad(n)
		{
			return (n < 10) ? '0' + n : n;
		}

		function format(h, m, s)
		{
			return pad(h) + ':' + pad(m)  + ':' + pad(s);
		}

		var d = new Date();
		return format(d.getHours(), d.getMinutes(), d.getSeconds());
	}

	return app;

})();

app.initialize();