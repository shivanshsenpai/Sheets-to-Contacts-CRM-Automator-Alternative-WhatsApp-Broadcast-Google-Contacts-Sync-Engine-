# Sheets-to-Contacts-CRM-Automator-Alternative-WhatsApp-Broadcast-Google-Contacts-Sync-Engine-
A robust, automated Google Apps Script solution that transforms any standard Google Sheet into a lightweight CRM. It allows users to bulk-export categorized contacts into neatly organized, WhatsApp-ready CSV files directly within Google Drive. Furthermore, it features a direct integration with the Google People API to sync contacts to phone
The Sheets-to-Contacts CRM Automator provides a custom menu inside Google Sheets, allowing users to select specific categories of contacts and route them to either Google Drive (as CSVs) or Google Contacts (as Address Book labels).

Core Features

Dual-Export System: Choose between generating WhatsApp broadcast CSV files or directly syncing to Google Contacts.

Smart API Pacing: Built-in rate-limiter that paces API calls to prevent triggering Google's security blocks.

Blind Auto-Retries: Automatically detects server throttles, pauses, and retries failed contact syncs seamlessly in the background.

Automated Drive Organization: Scans Google Drive for a designated target folder and automatically creates it if it doesn't exist before dropping CSV files inside.

State Tracking: Writes to a dedicated column in the spreadsheet to track which contacts have been successfully synced, ensuring no duplicates are created on subsequent runs.

Prerequisites

A Google Sheet with columns for Broadcast Name, Phone Number, and Category.

The Google People API must be enabled in the Google Apps Script Services menu.

Setup Instructions

Open your Google Sheet and navigate to Extensions > Apps Script.

Delete any existing code and paste the provided script.

On the left-hand menu, click Services (the + icon), select Google People API, and click Add.

Update the CONFIG object at the very top of the script with your specific categories, sheet names, and folder names.

Save the script and refresh your Google Sheet.

Click the new custom menu at the top to run the tools!
