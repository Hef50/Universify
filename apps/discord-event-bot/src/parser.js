const chrono = require('chrono-node');
const moment = require('moment-timezone');

class EventParser {
  parse(messageContent, messageCreatedAt) {
    const content = messageContent.toLowerCase();

    // Extract title - first line or after "event:"
    let title = '';
    const lines = messageContent.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('event:') || line.toLowerCase().includes('title:')) {
        title = line.split(':')[1]?.trim() || '';
        break;
      }
    }
    if (!title && lines.length > 0) {
      title = lines[0].trim();
    }

    // Extract date/time using chrono, with reference to message time in NY timezone
    const referenceDate = moment(messageCreatedAt).tz('America/New_York').toDate();
    const parsedDate = chrono.parse(messageContent, referenceDate, { timezone: 'America/New_York' });
    let startTime = null;
    let endTime = null;

    if (parsedDate.length > 0) {
      const result = parsedDate[0];
      startTime = moment(result.start.date()).tz('America/New_York').toISOString();
      if (result.end) {
        endTime = moment(result.end.date()).tz('America/New_York').toISOString();
      } else {
        endTime = startTime; // If only start time, set end equal to start
      }
    }

    // Extract location
    let location = '';
    for (const line of lines) {
      if (line.toLowerCase().includes('location:') || line.toLowerCase().includes('where:')) {
        location = line.split(':')[1]?.trim() || '';
        break;
      }
    }

    // Extract description - everything else
    let description = '';
    const descLines = lines.filter(line =>
      !line.toLowerCase().includes('event:') &&
      !line.toLowerCase().includes('title:') &&
      !line.toLowerCase().includes('date:') &&
      !line.toLowerCase().includes('time:') &&
      !line.toLowerCase().includes('location:') &&
      !line.toLowerCase().includes('where:') &&
      line.trim()
    );
    description = descLines.join('\n').trim();

    return {
      title: title || null,
      start_time: startTime,
      end_time: endTime,
      location: location || null,
      description: description || null,
      organizer_name: null, // Will be set to server name
      organizer_type: 'club',
      is_club_event: true,
      is_social_event: false
    };
  }
}

module.exports = EventParser;