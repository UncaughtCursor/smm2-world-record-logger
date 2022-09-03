# SMM2 World Record Logger

This is a simple tool that tracks the world record history of a set of Super Mario Maker 2 levels as they update in real time.

## Usage

To run the tool, make sure you have [Node.js](https://nodejs.org/en/download/) installed.

Open `course-ids.json` and enter a list of course IDs of levels to track. The syntax is shown in the following example:
```
[
	"7N1-MVB-WKF",
	"DRC-S88-TDF",
	"R8R-RV9-PJG"
]
```

Next, open a terminal and navigate to the project folder. Once there, run the command: `node main.mjs`.

The tool will check each level for updated world records about once every two minutes.

## Output Data

World record data will appear in `world-records.json`. This file will be created upon running the tool.

The structure of the data is a JSON object of key-value pairs. The keys are the course IDs and the values are a list of world records for the corresponding level.

Each world record is structured as follows:

```
{
	worldRecordTime (number; the time it took to complete the level in milliseconds),
	recordHolderId (string; the world record holder's maker ID),
	timeWhenRecorded (number; the millisecond unix timestamp when the world record was first saved)
}
```

## Data Source

[TheGreatRambler's API](https://tgrcode.com/mm2/docs/) is used to retrieve the level data.

## Potential Issues

**API Errors:** TGR's API doesn't like to be pinged a lot and sometimes has random errors. This tool will retry if any network errors occur, but will wait several seconds before doing so. It should eventually fall back into a stable rhythm.

**Hosting:** Tracking world records is often a multiple day affair, given how slowly they may change. I would highly recommended running this tool on a cloud server under a `systemd` service to ensure that it stays up and running.
