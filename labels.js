'use strict';

console.log('[labels] tool loaded');

(function () {

const {
db,
$,
$$,
collection,
getDocs,
addDoc
} = window.MTW;

/* ----------------------------------------
   CONFIG
---------------------------------------- */

const LABEL =
'.barcode-text-input-wrapper';

const TEMPLATES = {

standard: {
name: 'x2 Label Template',
panel: '#label-standard',
grid: '.label-standard-grid',
capacity: 2
},

medium: {
name: 'x8 Label Template',
panel: '#label-medium',
grid: '.label-medium-grid',
capacity: 8
},

large: {
name: 'x10 Label Template',
panel: '#label-large',
grid: '.label-large-grid',
capacity: 10
},

xlarge: {
name: 'x30 Label Template',
panel: '#label-xlarge',
grid: '.label-xlarge-grid',
capacity: 30
}

};

const DROPDOWN_OPEN_CLASS =
'label-dropdown-open';

const DEFAULTS = {

template:
'standard',

heading:
'',

subtext:
''

};

const state = {

current:
null,

cards:
[]

};

let counter =
0;

let editing =
null;

let ready =
false;

let quickImportModal =
null;

let clearConfirmModal =
null;

const els = {};

const sources = {};


/* ----------------------------------------
   TEMPLATE HELPERS
---------------------------------------- */

function getSource(
templateId
) {

const config =
TEMPLATES[
templateId
] ||
TEMPLATES.standard;

if (
sources[
config.panel
]
) {

return sources[
config.panel
];

}

const panel =
document.querySelector(
config.panel
);

if (!panel) {

return null;

}

const page =
panel.querySelector(
'.label-page:not([data-generated])'
) ||
panel.querySelector(
'.barcode-page:not([data-generated])'
);

if (!page) {

return null;

}

const label =
page.querySelector(
LABEL + ':not(.label-card):not(.barcode-card)'
);

if (!label) {

return null;

}

const pageCopy =
page.cloneNode(
true
);

const labelCopy =
label.cloneNode(
true
);

pageCopy.removeAttribute(
'id'
);

labelCopy.removeAttribute(
'id'
);

pageCopy
.querySelectorAll(
'[id]'
)
.forEach(
el =>
el.removeAttribute(
'id'
)
);

labelCopy
.querySelectorAll(
'[id]'
)
.forEach(
el =>
el.removeAttribute(
'id'
)
);

sources[
config.panel
] = {

page:
pageCopy,

label:
labelCopy

};

return sources[
config.panel
];

}

function cacheSources() {

Object.keys(
TEMPLATES
).forEach(
id =>
getSource(
id
)
);

}


/* ----------------------------------------
   CACHE
---------------------------------------- */

function findDropdown() {

const wrapper =
$('.db-list-dropdown-wrapper-labels');

if (wrapper) {

return wrapper;

}

const drop =
$('#label-drop');

if (!drop) {

return null;

}

return (

drop.querySelector(
'.db-list-dropdown-wrapper-labels'
) ||

drop.closest(
'.db-list-dropdown-wrapper-labels'
) ||

(
drop.nextElementSibling &&
drop.nextElementSibling.matches(
'.db-list-dropdown-wrapper-labels'
)
?
drop.nextElementSibling
:
null
)

);

}

function cache() {

els.panel =
$('.label-panels');

if (!els.panel) {

els.panel =
$('.barcode-label-panels');

}

els.add =
$('.label-add-card-button');

if (!els.add) {

els.add =
$('.barcode-add-card-button');

}

els.print =
$('.label-print-card-button');

if (!els.print) {

els.print =
$('.barcode-print-card-button');

}

els.quickImport =
$('.label-quickimp-card-button');

if (!els.quickImport) {

els.quickImport =
$('.barcode-quickimp-card-button');

}

els.clear =
$('.label-clear-card-button');

if (!els.clear) {

els.clear =
$('.barcode-clear-card-button');

}

els.clearWrapper =
$('.label-clear-card-wrapper');

if (!els.clearWrapper) {

els.clearWrapper =
$('.barcode-clear-card-wrapper');

}

els.dropdown =
findDropdown();

els.pages =
$('.label-page-wrapper');

if (!els.pages) {

els.pages =
$('.barcode-page-wrapper');

}

els.left =
$('.db-left-content');

els.menu =
$('.db-menu-list');

}


/* ----------------------------------------
   PANEL
---------------------------------------- */

function openLabelPanel() {

if (!els.panel) {

return;

}

els.panel.classList.add(
'open'
);

els.panel.style.removeProperty(
'display'
);

if (
getComputedStyle(
els.panel
).display ===
'none'
) {

els.panel.style.setProperty(
'display',
'block',
'important'
);

}

}

function closeLabelPanel() {

if (!els.panel) {

return;

}

els.panel.classList.remove(
'open'
);

els.panel.style.removeProperty(
'display'
);

}


/* ----------------------------------------
   STYLES
---------------------------------------- */

function injectStyles() {

if (
$('#label-tool-styles')
) {

return;

}

const style =
document.createElement(
'style'
);

style.id =
'label-tool-styles';

style.textContent = `

.db-list-dropdown-wrapper-labels:not(.${DROPDOWN_OPEN_CLASS})
.db-list-dropdown-card[data-label-template] {
display: none !important;
}

.db-list-dropdown-card[data-label-template] {
cursor: pointer;
}

.label-clear-card-wrapper {
transition: opacity .2s ease;
}

.label-clear-card-wrapper.label-clearing {
opacity: .65;
}

.label-clear-card-button {
cursor: pointer;
}

.label-card {
position: relative;
}

.label-card-overlay {
position: absolute;
inset: 0;
z-index: 20;
cursor: pointer;
}

.label-populate {
display: block !important;
width: 100% !important;
box-sizing: border-box !important;
text-align: center;
white-space: normal;
overflow-wrap: anywhere;
word-break: break-word;
}

.label-heading {
display: block;
width: 100%;
box-sizing: border-box;
text-align: center;
font-weight: 700;
}

.label-subtext {
display: block;
width: 100%;
box-sizing: border-box;
text-align: center;
font-weight: 400;
}

.db-left-content.editing {
width: 100% !important;
height: 100% !important;
min-height: 0 !important;
max-height: 100% !important;
overflow: hidden !important;
display: flex !important;
flex-direction: column !important;
overscroll-behavior: contain !important;
}

.db-left-content.editing .label-edit-panel {
flex: 1 1 auto !important;
width: 100% !important;
height: 50% !important;
min-height: 0 !important;
max-height: 50% !important;
overflow-y: auto !important;
overflow-x: hidden !important;
box-sizing: border-box !important;
padding-right: 10px !important;
overscroll-behavior: contain !important;
-webkit-overflow-scrolling: touch !important;
scrollbar-width: thin;
touch-action: pan-y;
}

.label-edit-panel::-webkit-scrollbar {
width: 6px;
}

.label-edit-panel::-webkit-scrollbar-track {
background: transparent;
}

.label-edit-panel::-webkit-scrollbar-thumb {
background: #ccc;
border-radius: 10px;
}

.label-edit-panel::-webkit-scrollbar-thumb:hover {
background: #aaa;
}

.label-edit-panel-header {
display: flex;
justify-content: space-between;
align-items: center;
flex: 0 0 auto;
margin-bottom: 16px;
padding-bottom: 12px;
border-bottom: 1px solid #eee;
}

.label-edit-panel-title {
font-weight: 700;
font-size: 18px;
}

.label-edit-panel-close {
border: 0;
background: none;
font-size: 24px;
cursor: pointer;
line-height: 1;
}

.label-edit-section {
border-top: 1px solid #eee;
padding-top: 16px;
margin-top: 16px;
}

.label-edit-section-title {
font-size: 11px;
font-weight: 700;
text-transform: uppercase;
margin-bottom: 12px;
}

.label-field-group {
margin-bottom: 12px;
}

.label-field-label,
.label-control-label {
display: block;
font-size: 11px;
font-weight: 600;
color: #444;
margin-bottom: 5px;
}

.label-field-input {
width: 100%;
box-sizing: border-box;
padding: 8px;
border: 1px solid #ccc;
border-radius: 5px;
font: inherit;
font-size: 12px;
}

.label-control-row {
display: flex;
align-items: center;
justify-content: space-between;
gap: 10px;
margin-bottom: 8px;
}

.label-control {
min-width: 100px;
padding: 6px;
border: 1px solid #ccc;
border-radius: 5px;
background: #fff;
font: inherit;
font-size: 11px;
}

.label-number {
width: 80px;
min-width: 80px;
}

.label-edit-panel-footer {
display: flex;
justify-content: flex-end;
align-items: center;
gap: 8px;
margin-top: 18px;
padding-top: 14px;
border-top: 1px solid #eee;
}

.label-edit-button {
border: 1px solid #ccc;
background: #fff;
border-radius: 5px;
padding: 8px 12px;
cursor: pointer;
font-size: 11px;
font-weight: 600;
}

.label-edit-button.primary {
background: #111;
color: #fff;
border-color: #111;
}

.label-clear-confirm-modal {
position: fixed;
inset: 0;
z-index: 100000;
display: flex;
align-items: center;
justify-content: center;
padding: 24px;
box-sizing: border-box;
background: rgba(0,0,0,.45);
opacity: 0;
transition: opacity .18s ease;
}

.label-clear-confirm-modal.is-visible {
opacity: 1;
}

.label-clear-confirm-box {
width: min(420px, 100%);
background: #fff;
border-radius: 10px;
box-shadow: 0 20px 60px rgba(0,0,0,.25);
display: flex;
flex-direction: column;
overflow: hidden;
font-family: inherit;
transform: translateY(8px) scale(.98);
transition: transform .18s ease;
}

.label-clear-confirm-modal.is-visible
.label-clear-confirm-box {
transform: translateY(0) scale(1);
}

.label-clear-confirm-header {
display: flex;
align-items: center;
justify-content: space-between;
padding: 18px 22px;
border-bottom: 1px solid #eee;
}

.label-clear-confirm-title {
font-size: 18px;
font-weight: 700;
margin: 0;
}

.label-clear-confirm-close {
width: 32px;
height: 32px;
border: 0;
background: transparent;
font-size: 24px;
line-height: 1;
cursor: pointer;
border-radius: 5px;
}

.label-clear-confirm-close:hover {
background: #f2f2f2;
}

.label-clear-confirm-body {
padding: 22px;
}

.label-clear-confirm-message {
margin: 0;
font-size: 13px;
line-height: 1.5;
color: #555;
}

.label-clear-confirm-count {
font-weight: 700;
color: #222;
}

.label-clear-confirm-footer {
display: flex;
align-items: center;
justify-content: flex-end;
gap: 8px;
padding: 14px 22px;
border-top: 1px solid #eee;
}

.label-clear-confirm-button {
border: 1px solid #ccc;
background: #fff;
border-radius: 5px;
padding: 9px 14px;
cursor: pointer;
font-size: 12px;
font-weight: 600;
}

.label-clear-confirm-button:hover {
background: #f5f5f5;
}

.label-clear-confirm-button.danger {
background: #111;
color: #fff;
border-color: #111;
}

.label-clear-confirm-button.danger:hover {
background: #333;
}

.label-quickimp-modal {
position: fixed;
inset: 0;
z-index: 99999;
display: flex;
align-items: center;
justify-content: center;
padding: 24px;
box-sizing: border-box;
background: rgba(0,0,0,.45);
}

.label-quickimp-modal-box {
width: min(950px, 100%);
max-height: min(850px, 92vh);
background: #fff;
border-radius: 10px;
box-shadow: 0 20px 60px rgba(0,0,0,.25);
display: flex;
flex-direction: column;
overflow: hidden;
font-family: inherit;
}

.label-quickimp-modal-header {
display: flex;
align-items: center;
justify-content: space-between;
padding: 18px 22px;
border-bottom: 1px solid #eee;
flex: 0 0 auto;
}

.label-quickimp-modal-title {
font-size: 18px;
font-weight: 700;
margin: 0;
}

.label-quickimp-modal-close {
width: 32px;
height: 32px;
border: 0;
background: transparent;
font-size: 24px;
line-height: 1;
cursor: pointer;
border-radius: 5px;
}

.label-quickimp-modal-close:hover {
background: #f2f2f2;
}

.label-quickimp-modal-body {
padding: 20px 22px;
overflow-y: auto;
min-height: 0;
}

.label-quickimp-description {
margin: 0 0 12px;
font-size: 12px;
line-height: 1.5;
color: #666;
}

.label-quickimp-textarea {
display: block;
width: 100%;
min-height: 240px;
box-sizing: border-box;
resize: vertical;
padding: 12px;
border: 1px solid #ccc;
border-radius: 6px;
background: #fff;
color: #222;
font: inherit;
font-size: 12px;
line-height: 1.5;
outline: none;
}

.label-quickimp-textarea:focus {
border-color: #111;
}

.label-quickimp-options {
display: flex;
align-items: center;
justify-content: space-between;
gap: 12px;
margin-top: 14px;
padding: 12px;
border: 1px solid #eee;
border-radius: 6px;
background: #fafafa;
}

.label-quickimp-checkbox-label {
display: flex;
align-items: center;
gap: 8px;
font-size: 13px;
font-weight: 600;
cursor: pointer;
}

.label-quickimp-checkbox {
width: 16px;
height: 16px;
margin: 0;
cursor: pointer;
}

.label-quickimp-summary {
font-size: 12px;
color: #666;
}

.label-quickimp-preview-title {
margin: 18px 0 8px;
font-size: 12px;
font-weight: 700;
}

.label-quickimp-preview-wrap {
border: 1px solid #eee;
border-radius: 6px;
overflow: auto;
max-height: 280px;
}

.label-quickimp-preview {
width: 100%;
border-collapse: collapse;
font-size: 12px;
}

.label-quickimp-preview th {
position: sticky;
top: 0;
z-index: 2;
background: #f5f5f5;
border-bottom: 1px solid #ddd;
padding: 9px 10px;
text-align: left;
font-weight: 700;
white-space: nowrap;
}

.label-quickimp-preview td {
padding: 7px 10px;
border-bottom: 1px solid #eee;
vertical-align: middle;
}

.label-quickimp-preview tr:last-child td {
border-bottom: 0;
}

.label-quickimp-preview tr:hover td {
background: #fafafa;
}

.label-quickimp-preview-part {
font-weight: 700;
white-space: nowrap;
}

.label-quickimp-preview-description {
color: #555;
min-width: 300px;
}

.label-quickimp-preview-qty {
width: 65px;
padding: 6px 7px;
border: 1px solid #ccc;
border-radius: 5px;
font-size: 12px;
box-sizing: border-box;
text-align: center;
}

.label-quickimp-preview-qty:focus {
outline: none;
border-color: #111;
}

.label-quickimp-empty {
padding: 24px 12px;
text-align: center;
font-size: 12px;
color: #888;
}

.label-quickimp-error {
margin-top: 10px;
font-size: 12px;
color: #b00020;
}

.label-quickimp-modal-footer {
display: flex;
align-items: center;
justify-content: flex-end;
gap: 8px;
padding: 14px 22px;
border-top: 1px solid #eee;
flex: 0 0 auto;
}

.label-quickimp-button {
border: 1px solid #ccc;
background: #fff;
border-radius: 5px;
padding: 9px 14px;
cursor: pointer;
font-size: 12px;
font-weight: 600;
}

.label-quickimp-button:hover {
background: #f5f5f5;
}

.label-quickimp-button.primary {
background: #111;
color: #fff;
border-color: #111;
}

.label-quickimp-button.primary:hover {
background: #333;
}

#label-print-root {
display: none;
}

@media (max-width: 700px) {

.label-quickimp-modal {
padding: 10px;
}

.label-quickimp-modal-box {
max-height: 94vh;
}

.label-quickimp-modal-body {
padding: 16px;
}

.label-quickimp-textarea {
min-height: 220px;
}

.label-quickimp-options {
align-items: flex-start;
flex-direction: column;
}

.label-quickimp-summary {
width: 100%;
}

.label-quickimp-preview-description {
min-width: 200px;
}

.label-clear-confirm-modal {
padding: 10px;
}

}

@media print {

html,
body {
margin: 0 !important;
padding: 0 !important;
width: 100% !important;
height: auto !important;
}

body > *:not(#label-print-root) {
display: none !important;
}

#label-print-root {
display: block !important;
position: static !important;
width: 100% !important;
height: auto !important;
margin: 0 !important;
padding: 0 !important;
overflow: visible !important;
}

#label-print-root .label-page,
#label-print-root .barcode-page {
display: block !important;
position: relative !important;
width: 210mm !important;
height: 297mm !important;
margin: 0 !important;
padding: 0 !important;
overflow: hidden !important;
break-after: page;
page-break-after: always;
box-sizing: border-box !important;
}

#label-print-root .label-page:last-child,
#label-print-root .barcode-page:last-child {
break-after: auto;
page-break-after: auto;
}

#label-print-root * {
visibility: visible !important;
}

#label-print-root .label-card-overlay,
#label-print-root .barcode-card-overlay,
#label-print-root .label-edit-panel,
#label-print-root .barcode-edit-panel {
display: none !important;
}

}

`;

document.head.appendChild(
style
);

}


/* ----------------------------------------
   CARD DATA
---------------------------------------- */

function cardData(
data = {}
) {

counter++;

return {

id:
data.id ||
'label-' +
counter,

template:
data.template ||
state.current ||
DEFAULTS.template,

heading:
data.heading ??
DEFAULTS.heading,

subtext:
data.subtext ??
DEFAULTS.subtext

};

}

function get(
id
) {

return state.cards.find(
card =>
card.id === id
);

}

function add(
data = {}
) {

const card =
cardData(
data
);

state.cards.push(
card
);

state.current =
card.template;

render();

return card;

}


/* ----------------------------------------
   DELETE / CLEAR
---------------------------------------- */

function remove(
id
) {

const deleted =
get(
id
);

if (!deleted) {

return;

}

const templateCards =
state.cards.filter(
card =>
card.template ===
deleted.template
);

const deletedIndex =
templateCards.findIndex(
card =>
card.id === id
);

const previousCard =
templateCards[
deletedIndex - 1
];

const nextCard =
templateCards[
deletedIndex + 1
];

const replacement =
previousCard ||
nextCard ||
null;

state.cards =
state.cards.filter(
card =>
card.id !== id
);

if (
editing === id &&
replacement
) {

state.current =
replacement.template;

render();

const remaining =
get(
replacement.id
);

if (remaining) {

openEdit(
remaining
);

}

return;

}

if (
editing === id
) {

hideEdit();

}

render();

}

function clearAllCards() {

if (!state.cards.length) {

return;

}

openClearConfirm();

}

function performClearAll() {

if (!state.cards.length) {

return;

}

const cards =
els.panel
?
els.panel.querySelectorAll(
'.label-card, .barcode-card'
)
:
[];

if (
els.clearWrapper
) {

els.clearWrapper.classList.add(
'label-clearing'
);

}

cards.forEach(
(card, index) => {

card.style.transition =
'opacity .18s ease, transform .18s ease';

card.style.opacity =
'0';

card.style.transform =
'scale(.96)';

card.style.transitionDelay =
Math.min(
index * 15,
120
) +
'ms';

}
);

setTimeout(
() => {

state.cards = [];

hideEdit();

render();

if (
els.clearWrapper
) {

els.clearWrapper.classList.remove(
'label-clearing'
);

}

},
220
);

}

function closeClearConfirm() {

if (
!clearConfirmModal
) {

return;

}

const modal =
clearConfirmModal;

modal.classList.remove(
'is-visible'
);

setTimeout(
() => {

if (
modal ===
clearConfirmModal
) {

modal.remove();

clearConfirmModal =
null;

}

},
180
);

}

function openClearConfirm() {

if (
!state.cards.length
) {

return;

}

closeClearConfirm();

const modal =
document.createElement(
'div'
);

modal.className =
'label-clear-confirm-modal';

modal.setAttribute(
'role',
'dialog'
);

modal.setAttribute(
'aria-modal',
'true'
);

const box =
document.createElement(
'div'
);

box.className =
'label-clear-confirm-box';

const header =
document.createElement(
'div'
);

header.className =
'label-clear-confirm-header';

const title =
document.createElement(
'h2'
);

title.className =
'label-clear-confirm-title';

title.textContent =
'Clear All Labels';

const closeButton =
document.createElement(
'button'
);

closeButton.type =
'button';

closeButton.className =
'label-clear-confirm-close';

closeButton.textContent =
'×';

closeButton.setAttribute(
'aria-label',
'Close'
);

closeButton.addEventListener(
'click',
closeClearConfirm
);

header.append(
title,
closeButton
);

const body =
document.createElement(
'div'
);

body.className =
'label-clear-confirm-body';

const message =
document.createElement(
'p'
);

message.className =
'label-clear-confirm-message';

message.innerHTML =
'Are you sure you want to remove all ' +
'<span class="label-clear-confirm-count">' +
state.cards.length +
'</span> label' +
(
state.cards.length === 1
? ''
: 's'
) +
'? This cannot be undone.';

body.appendChild(
message
);

const footer =
document.createElement(
'div'
);

footer.className =
'label-clear-confirm-footer';

const cancel =
document.createElement(
'button'
);

cancel.type =
'button';

cancel.className =
'label-clear-confirm-button';

cancel.textContent =
'Cancel';

cancel.addEventListener(
'click',
closeClearConfirm
);

const confirm =
document.createElement(
'button'
);

confirm.type =
'button';

confirm.className =
'label-clear-confirm-button danger';

confirm.textContent =
'Clear All';

confirm.addEventListener(
'click',
function () {

closeClearConfirm();

performClearAll();

}
);

footer.append(
cancel,
confirm
);

box.append(
header,
body,
footer
);

modal.appendChild(
box
);

modal.addEventListener(
'click',
function (e) {

if (
e.target === modal
) {

closeClearConfirm();

}

}
);

modal.addEventListener(
'keydown',
function (e) {

if (
e.key === 'Escape'
) {

closeClearConfirm();

}

}
);

document.body.appendChild(
modal
);

clearConfirmModal =
modal;

requestAnimationFrame(
() => {

modal.classList.add(
'is-visible'
);

}
);

setTimeout(
() =>
confirm.focus(),
50
);

}


/* ----------------------------------------
   TEXT HELPERS
---------------------------------------- */

function cleanPartNumber(
value
) {

return String(
value || ''
)
.trim()
.replace(
/^#/,
''
)
.trim();

}

function importedPartNumber(
value
) {

const clean =
cleanPartNumber(
value
);

if (!clean) {

return '';

}

return '#' +
clean;

}

function simplifyDescription(
value,
template
) {

let text =
String(
value ??
''
)
.replace(
/[\r\n\t]+/g,
' '
)
.replace(
/\s+/g,
' '
)
.replace(
/\s+([,.;:])/g,
'$1'
)
.trim();

if (
template === 'xlarge' &&
text.length > 83
) {

text =
text
.slice(
0,
83
)
.trimEnd() +
'...';

}

return text;

}


/* ----------------------------------------
   POPULATE CARD
---------------------------------------- */

function populateCard(
card,
data
) {

const header =
card.querySelector(
'.text-input-header > *'
) ||
card.querySelector(
'.text-input-header'
);

const subtext =
card.querySelector(
'.text-input-subtext > *'
) ||
card.querySelector(
'.text-input-subtext'
);

if (header) {

header.textContent =
data.heading ||
'';

}

if (subtext) {

subtext.textContent =
data.subtext ||
'';

}


/* Remove any barcode element from
   the cloned source label. */

card.querySelectorAll(
'.barcode-populate'
).forEach(
el =>
el.remove()
);


/* Remove any old optional barcode
   layout from the cloned source. */

card.querySelectorAll(
'.barcode-label-layout'
).forEach(
layout => {

const main =
layout.querySelector(
'.barcode-label-main'
);

if (main) {

while (
main.firstChild
) {

card.insertBefore(
main.firstChild,
layout
);

}

}

layout.remove();

}
);

}


/* ----------------------------------------
   CREATE CARD
---------------------------------------- */

function createCard(
data
) {

const src =
getSource(
data.template
);

if (!src) {

console.warn(
'[labels] Template source not found:',
data.template
);

return null;

}

const card =
src.label.cloneNode(
true
);

card.classList.add(
'label-card'
);

card.dataset.cardId =
data.id;

card.dataset.labelTemplate =
data.template;

populateCard(
card,
data
);

const overlay =
document.createElement(
'div'
);

overlay.className =
'label-card-overlay';

overlay.addEventListener(
'click',
function (e) {

e.preventDefault();
e.stopPropagation();

const liveCard =
get(
data.id
);

openEdit(
liveCard ||
data
);

}
);

card.appendChild(
overlay
);

return card;

}


/* ----------------------------------------
   CHUNK
---------------------------------------- */

function chunk(
cards,
size
) {

const pages = [];

for (
let i = 0;
i < cards.length;
i += size
) {

pages.push(
cards.slice(
i,
i + size
)
);

}

return pages;

}


/* ----------------------------------------
   RENDER TEMPLATE
---------------------------------------- */

function renderTemplate(
id
) {

const config =
TEMPLATES[
id
];

if (!config) {

return;

}

const panel =
document.querySelector(
config.panel
);

if (!panel) {

return;

}

const wrapper =
panel.querySelector(
'.label-page-wrapper'
) ||
panel.querySelector(
'.barcode-page-wrapper'
) ||
panel;

if (
id !==
state.current
) {

wrapper
.querySelectorAll(
'.label-page[data-generated], .barcode-page[data-generated]'
)
.forEach(
page =>
page.remove()
);

panel.style.removeProperty(
'display'
);

return;

}

const src =
getSource(
id
);

if (!src) {

console.warn(
'[labels] Cannot render template:',
id
);

return;

}

const cards =
state.cards.filter(
card =>
card.template === id
);

wrapper.innerHTML =
'';

const groups =
cards.length
?
chunk(
cards,
config.capacity
)
:
[[]];

groups.forEach(
group => {

const page =
src.page.cloneNode(
true
);

page.dataset.generated =
'true';

const grid =
page.querySelector(
config.grid
) ||
page.querySelector(
'[class*="label"][class*="grid"]'
) ||
page.querySelector(
'[class*="barcode"][class*="grid"]'
) ||
page.querySelector(
'[class*="-grid"]'
);

if (!grid) {

console.warn(
'[labels] Grid not found:',
config.grid
);

return;

}

grid.innerHTML =
'';

group.forEach(
data => {

const card =
createCard(
data
);

if (card) {

grid.appendChild(
card
);

}

}
);

wrapper.appendChild(
page
);

unhide(
wrapper,
'block'
);

unhide(
page,
'block'
);

unhide(
grid,
'grid'
);

grid
.querySelectorAll(
'.label-card'
)
.forEach(
card =>
unhide(
card,
'block'
)
);

}
);

panel.style.setProperty(
'display',
'block',
'important'
);

}

function unhide(
el,
display
) {

if (!el) {

return;

}

if (
getComputedStyle(
el
).display ===
'none'
) {

el.style.setProperty(
'display',
display,
'important'
);

}

}


/* ----------------------------------------
   RENDER
---------------------------------------- */

function render() {

if (
!els.panel ||
!els.panel.isConnected
) {

cache();

}

if (!els.panel) {

return;

}

Object.keys(
TEMPLATES
).forEach(
renderTemplate
);

if (!state.current) {

closeLabelPanel();

}

}


/* ----------------------------------------
   LIVE UPDATE
---------------------------------------- */

function live(
data
) {

if (!els.panel) {

return;

}

els.panel
.querySelectorAll(
'[data-card-id="' +
data.id +
'"]'
)
.forEach(
card => {

populateCard(
card,
data
);

}
);

}


/* ----------------------------------------
   EDIT FIELDS
---------------------------------------- */

function textField(
label,
value,
callback
) {

const wrap =
document.createElement(
'div'
);

wrap.className =
'label-field-group';

const l =
document.createElement(
'label'
);

l.className =
'label-field-label';

l.textContent =
label;

const input =
document.createElement(
'input'
);

input.className =
'label-field-input';

input.type =
'text';

input.value =
value ??
'';

input.addEventListener(
'input',
() =>
callback(
input.value
)
);

wrap.append(
l,
input
);

return wrap;

}

function numberField(
label,
value,
callback
) {

const wrap =
document.createElement(
'div'
);

wrap.className =
'label-control-row';

const l =
document.createElement(
'label'
);

l.className =
'label-control-label';

l.textContent =
label;

const input =
document.createElement(
'input'
);

input.className =
'label-control label-number';

input.type =
'number';

input.min =
'1';

input.value =
value ??
'';

input.addEventListener(
'input',
() =>
callback(
input.value
)
);

wrap.append(
l,
input
);

return wrap;

}

function section(
title,
children
) {

const s =
document.createElement(
'div'
);

s.className =
'label-edit-section';

const h =
document.createElement(
'div'
);

h.className =
'label-edit-section-title';

h.textContent =
title;

s.appendChild(
h
);

children.forEach(
child =>
s.appendChild(
child
)
);

return s;

}

function button(
label,
className,
onClick
) {

const b =
document.createElement(
'button'
);

b.type =
'button';

b.className =
className;

b.textContent =
label;

b.onclick =
onClick;

return b;

}


/* ----------------------------------------
   EDIT PANEL
---------------------------------------- */

function buildEditPanel(
card
) {

const panel =
document.createElement(
'div'
);

panel.className =
'label-edit-panel';

panel.dataset.cardId =
card.id;

const header =
document.createElement(
'div'
);

header.className =
'label-edit-panel-header';

const title =
document.createElement(
'div'
);

title.className =
'label-edit-panel-title';

title.textContent =
'Edit Label';

header.append(
title,
button(
'×',
'label-edit-panel-close',
hideEdit
)
);

panel.appendChild(
header
);

panel.appendChild(
section(
'Content',
[

textField(
'Heading',
card.heading,
value => {

card.heading =
value;

live(
card
);

}
),

textField(
'Subtext',
card.subtext,
value => {

card.subtext =
value;

live(
card
);

}
)

]
)
);

panel.appendChild(
section(
'Text Size',
[

numberField(
'Heading Font Size',
card.headingSize ||
30,
value => {

card.headingSize =
Number(
value
) ||
30;

const rendered =
els.panel
?.querySelectorAll(
'[data-card-id="' +
card.id +
'"]'
);

rendered?.forEach(
element => {

const header =
element.querySelector(
'.text-input-header > *'
) ||
element.querySelector(
'.text-input-header'
);

if (header) {

header.style.fontSize =
card.headingSize +
'px';

}

}
);

}
),

numberField(
'Subtext Font Size',
card.subtextSize ||
18,
value => {

card.subtextSize =
Number(
value
) ||
18;

const rendered =
els.panel
?.querySelectorAll(
'[data-card-id="' +
card.id +
'"]'
);

rendered?.forEach(
element => {

const subtext =
element.querySelector(
'.text-input-subtext > *'
) ||
element.querySelector(
'.text-input-subtext'
);

if (subtext) {

subtext.style.fontSize =
card.subtextSize +
'px';

}

}
);

}
)

]
)
);

const footer =
document.createElement(
'div'
);

footer.className =
'label-edit-panel-footer';

footer.append(

button(
'Reset',
'label-edit-button',
() => {

card.heading =
DEFAULTS.heading;

card.subtext =
DEFAULTS.subtext;

card.headingSize =
30;

card.subtextSize =
18;

render();

openEdit(
card
);

}
),

button(
'Copy',
'label-edit-button',
() => {

const duplicate =
add({

template:
card.template,

heading:
card.heading,

subtext:
card.subtext,

headingSize:
card.headingSize,

subtextSize:
card.subtextSize

});

openEdit(
duplicate
);

}
),

button(
'Delete',
'label-edit-button',
() => {

remove(
card.id
);

}
),

button(
'Save',
'label-edit-button primary',
() => {

render();

hideEdit();

}
)

);

panel.appendChild(
footer
);

return panel;

}

function openEdit(
card
) {

if (!card) {

return;

}

const host =
els.left ||
els.panel;

if (!host) {

return;

}

openLabelPanel();

const old =
host.querySelector(
'.label-edit-panel'
);

if (old) {

old.remove();

}

editing =
card.id;

if (els.left) {

if (els.menu) {

els.menu.style.display =
'none';

}

els.left.classList.add(
'editing'
);

}

const panel =
buildEditPanel(
card
);

host.appendChild(
panel
);

requestAnimationFrame(
() => {

panel.scrollTop =
0;

}
);

}

function hideEdit() {

editing =
null;

[
els.left,
els.panel
].forEach(
host => {

if (!host) {

return;

}

const panel =
host.querySelector(
'.label-edit-panel'
);

if (panel) {

panel.remove();

}

}
);

if (els.left) {

els.left.classList.remove(
'editing'
);

}

if (els.menu) {

els.menu.style.display =
'';

}

}


/* ----------------------------------------
   TEMPLATE SELECTOR
---------------------------------------- */

function selectTemplate(
id
) {

if (!TEMPLATES[id]) {

return;

}

state.current =
id;

if (editing) {

const card =
get(
editing
);

if (
!card ||
card.template !== id
) {

hideEdit();

}

}

render();

openLabelPanel();

}


/* ----------------------------------------
   DROPDOWN
---------------------------------------- */

function keepDropdownOpen() {

if (!els.dropdown) {

return;

}

els.dropdown.classList.add(
DROPDOWN_OPEN_CLASS
);

const cards =
els.dropdown.querySelectorAll(
'.db-list-dropdown-card[data-label-template]'
);

cards.forEach(
item => {

item.style.removeProperty(
'display'
);

}
);

}

function createDropdown(
wrapper
) {

if (!wrapper) {

return;

}

if (
wrapper.dataset.loaded ===
'true'
) {

return;

}

Object.entries(
TEMPLATES
).forEach(
([id, template]) => {

const item =
document.createElement(
'div'
);

item.className =
'db-list-dropdown-card';

item.dataset.labelTemplate =
id;

const heading =
document.createElement(
'div'
);

heading.className =
'db-headingd-list';

heading.textContent =
template.name;

item.appendChild(
heading
);

wrapper.appendChild(
item
);

}
);

wrapper.addEventListener(
'click',
function (e) {

const item =
e.target.closest(
'.db-list-dropdown-card[data-label-template]'
);

if (!item) {

return;

}

e.preventDefault();
e.stopPropagation();
e.stopImmediatePropagation();

const selectedTemplate =
item.dataset.labelTemplate;

console.log(
'[labels] template picked:',
selectedTemplate
);

selectTemplate(
selectedTemplate
);

keepDropdownOpen();

setTimeout(
keepDropdownOpen,
0
);

setTimeout(
keepDropdownOpen,
50
);

},
true
);

wrapper.dataset.loaded =
'true';

}

function closeDropdown() {

if (!els.dropdown) {

return;

}

els.dropdown.classList.remove(
DROPDOWN_OPEN_CLASS
);

}

function toggleDropdown() {

if (!els.dropdown) {

return;

}

const isOpen =
els.dropdown.classList.contains(
DROPDOWN_OPEN_CLASS
);

if (isOpen) {

closeDropdown();

} else {

keepDropdownOpen();

}

}


/* ----------------------------------------
   QUICK IMPORT
---------------------------------------- */

function closeQuickImportModal() {

if (!quickImportModal) {

return;

}

quickImportModal.remove();

quickImportModal =
null;

}

function parseQuickDelimitedLine(
line,
delimiter
) {

const cells = [];

let cell =
'';

let quoted =
false;

for (
let i = 0;
i < line.length;
i++
) {

const char =
line[i];

const next =
line[i + 1];

if (
char === '"' &&
quoted &&
next === '"'
) {

cell += '"';

i++;

continue;

}

if (
char === '"'
) {

quoted =
!quoted;

continue;

}

if (
char === delimiter &&
!quoted
) {

cells.push(
cell
);

cell =
'';

continue;

}

cell +=
char;

}

cells.push(
cell
);

return cells;

}

function normaliseQuickHeader(
value
) {

return String(
value ??
''
)
.replace(
/^\uFEFF/,
''
)
.replace(
/^"|"$/g,
''
)
.trim()
.toLowerCase()
.replace(
/\s+/g,
' '
);

}

function parseQuickImport(
text
) {

const lines =
String(
text ||
''
)
.replace(
/\r\n/g,
'\n'
)
.replace(
/\r/g,
'\n'
)
.split(
'\n'
)
.filter(
line =>
line.trim() !== ''
);

if (!lines.length) {

return [];

}

let headerIndex =
-1;

let delimiter =
'\t';

for (
let i = 0;
i < lines.length;
i++
) {

const testDelimiter =
lines[i].includes('\t')
?
'\t'
:
',';

const cells =
parseQuickDelimitedLine(
lines[i],
testDelimiter
);

const headers =
cells.map(
normaliseQuickHeader
);

const hasStockCode =
headers.includes(
'stock code'
);

const hasDescription =
headers.includes(
'description'
);

const hasQty =
headers.includes(
'qty'
);

if (
hasStockCode &&
hasDescription &&
hasQty
) {

headerIndex =
i;

delimiter =
testDelimiter;

break;

}

}

if (
headerIndex === -1
) {

return [];

}

const headers =
parseQuickDelimitedLine(
lines[
headerIndex
],
delimiter
)
.map(
normaliseQuickHeader
);

const stockCodeIndex =
headers.indexOf(
'stock code'
);

const descriptionIndex =
headers.indexOf(
'description'
);

const qtyIndex =
headers.indexOf(
'qty'
);

if (
stockCodeIndex === -1 ||
descriptionIndex === -1 ||
qtyIndex === -1
) {

return [];

}

const rows = [];

for (
let i =
headerIndex + 1;
i < lines.length;
i++
) {

const cells =
parseQuickDelimitedLine(
lines[i],
delimiter
);

const partNumber =
importedPartNumber(
cells[
stockCodeIndex
] ||
''
);

if (!partNumber) {

continue;

}

const description =
String(
cells[
descriptionIndex
] ||
''
)
.trim();

let qty =
parseInt(
String(
cells[
qtyIndex
] ||
''
)
.trim(),
10
);

if (
!Number.isFinite(qty) ||
qty < 1
) {

qty =
1;

}

rows.push({

partNumber,

description,

qty

});

}

return rows;

}


/* ----------------------------------------
   QUICK IMPORT PREVIEW
---------------------------------------- */

function renderQuickImportPreview(
rows,
tbody,
summary,
empty,
error,
qtyInputs
) {

tbody.innerHTML =
'';

qtyInputs.length =
0;

if (!rows.length) {

empty.style.display =
'block';

summary.textContent =
'No valid rows found';

return;

}

empty.style.display =
'none';

let total =
0;

rows.forEach(
row => {

const tr =
document.createElement(
'tr'
);

const partCell =
document.createElement(
'td'
);

partCell.className =
'label-quickimp-preview-part';

partCell.textContent =
row.partNumber;

const descriptionCell =
document.createElement(
'td'
);

descriptionCell.className =
'label-quickimp-preview-description';

descriptionCell.textContent =
row.description ||
'';

const qtyCell =
document.createElement(
'td'
);

const qty =
document.createElement(
'input'
);

qty.type =
'number';

qty.min =
'1';

qty.step =
'1';

qty.className =
'label-quickimp-preview-qty';

qty.value =
String(
Math.max(
1,
parseInt(
row.qty,
10
) ||
1
)
);

qty.addEventListener(
'input',
function () {

let value =
parseInt(
qty.value,
10
);

if (
!Number.isFinite(value) ||
value < 1
) {

value =
1;

}

qty.value =
value;

row.qty =
value;

updateQuickImportSummary(
summary,
rows,
qtyInputs
);

}
);

qtyInputs.push(
qty
);

qtyCell.appendChild(
qty
);

tr.append(
partCell,
descriptionCell,
qtyCell
);

tbody.appendChild(
tr
);

total +=
Math.max(
1,
parseInt(
row.qty,
10
) ||
1
);

}
);

summary.textContent =
total +
' label' +
(
total === 1
?
''
:
's'
) +
' ready to import';

if (error) {

error.textContent =
'';

}

}

function updateQuickImportSummary(
summary,
rows,
qtyInputs
) {

let total =
0;

qtyInputs.forEach(
input => {

let value =
parseInt(
input.value,
10
);

if (
!Number.isFinite(value) ||
value < 1
) {

value =
1;

}

total +=
value;

}
);

summary.textContent =
total +
' label' +
(
total === 1
?
''
:
's'
) +
' ready to import';

}


/* ----------------------------------------
   QUICK IMPORT MODAL
---------------------------------------- */

function openQuickImportModal() {

closeQuickImportModal();

const modal =
document.createElement(
'div'
);

modal.className =
'label-quickimp-modal';

modal.setAttribute(
'role',
'dialog'
);

modal.setAttribute(
'aria-modal',
'true'
);

const box =
document.createElement(
'div'
);

box.className =
'label-quickimp-modal-box';

const header =
document.createElement(
'div'
);

header.className =
'label-quickimp-modal-header';

const title =
document.createElement(
'h2'
);

title.className =
'label-quickimp-modal-title';

title.textContent =
'Quick Import';

const closeButton =
document.createElement(
'button'
);

closeButton.type =
'button';

closeButton.className =
'label-quickimp-modal-close';

closeButton.textContent =
'×';

closeButton.setAttribute(
'aria-label',
'Close'
);

closeButton.addEventListener(
'click',
closeQuickImportModal
);

header.append(
title,
closeButton
);

const body =
document.createElement(
'div'
);

body.className =
'label-quickimp-modal-body';

const description =
document.createElement(
'p'
);

description.className =
'label-quickimp-description';

description.textContent =
'Paste your order data below. Quick Import only uses Stock Code, Description and Qty.';

const textarea =
document.createElement(
'textarea'
);

textarea.className =
'label-quickimp-textarea';

textarea.placeholder =
'Paste order data here...';

textarea.spellcheck =
false;

const options =
document.createElement(
'div'
);

options.className =
'label-quickimp-options';

const label =
document.createElement(
'label'
);

label.className =
'label-quickimp-checkbox-label';

const checkbox =
document.createElement(
'input'
);

checkbox.type =
'checkbox';

checkbox.className =
'label-quickimp-checkbox';

checkbox.checked =
true;

const labelText =
document.createElement(
'span'
);

labelText.textContent =
'Part Number + Description';

label.append(
checkbox,
labelText
);

const summary =
document.createElement(
'div'
);

summary.className =
'label-quickimp-summary';

summary.textContent =
'No data pasted';

options.append(
label,
summary
);

const previewTitle =
document.createElement(
'div'
);

previewTitle.className =
'label-quickimp-preview-title';

previewTitle.textContent =
'Preview';

const previewWrap =
document.createElement(
'div'
);

previewWrap.className =
'label-quickimp-preview-wrap';

const table =
document.createElement(
'table'
);

table.className =
'label-quickimp-preview';

const thead =
document.createElement(
'thead'
);

const headerRow =
document.createElement(
'tr'
);

[
'Part Number',
'Description',
'Qty'
].forEach(
text => {

const th =
document.createElement(
'th'
);

th.textContent =
text;

headerRow.appendChild(
th
);

}
);

thead.appendChild(
headerRow
);

const tbody =
document.createElement(
'tbody'
);

table.append(
thead,
tbody
);

previewWrap.appendChild(
table
);

const empty =
document.createElement(
'div'
);

empty.className =
'label-quickimp-empty';

empty.textContent =
'Paste order data above to preview the labels.';

const error =
document.createElement(
'div'
);

error.className =
'label-quickimp-error';

const previewContainer =
document.createElement(
'div'
);

previewContainer.append(
previewTitle,
previewWrap,
empty,
error
);

body.append(
description,
textarea,
options,
previewContainer
);

const qtyInputs = [];

let parsedRows = [];

function refreshPreview() {

parsedRows =
parseQuickImport(
textarea.value
);

renderQuickImportPreview(
parsedRows,
tbody,
summary,
empty,
error,
qtyInputs
);

}

textarea.addEventListener(
'input',
refreshPreview
);

checkbox.addEventListener(
'change',
function () {

const template =
state.current ||
DEFAULTS.template;

if (
!parsedRows.length
) {

return;

}

parsedRows.forEach(
row => {

if (
checkbox.checked
) {

row.description =
simplifyDescription(
row.description,
template
);

}

}
);

renderQuickImportPreview(
parsedRows,
tbody,
summary,
empty,
error,
qtyInputs
);

}
);

const footer =
document.createElement(
'div'
);

footer.className =
'label-quickimp-modal-footer';

const cancel =
document.createElement(
'button'
);

cancel.type =
'button';

cancel.className =
'label-quickimp-button';

cancel.textContent =
'Cancel';

cancel.addEventListener(
'click',
closeQuickImportModal
);

const importButton =
document.createElement(
'button'
);

importButton.type =
'button';

importButton.className =
'label-quickimp-button primary';

importButton.textContent =
'Import Labels';

importButton.addEventListener(
'click',
function () {

if (
!parsedRows.length
) {

error.textContent =
'No valid Stock Code, Description and Qty data was found.';

return;

}

const template =
state.current ||
DEFAULTS.template;

const useDescription =
checkbox.checked;

let imported =
0;

parsedRows.forEach(
(row, index) => {

let qtyValue =
parseInt(
qtyInputs[
index
]?.value ??
row.qty,
10
);

if (
!Number.isFinite(qtyValue) ||
qtyValue < 1
) {

qtyValue =
1;

}

const description =
useDescription
?
simplifyDescription(
row.description,
template
)
:
'';

for (
let i = 0;
i < qtyValue;
i++
) {

const card =
cardData({

template,

heading:
row.partNumber,

subtext:
description

});

state.cards.push(
card
);

imported++;

}

}
);

state.current =
template;

closeQuickImportModal();

render();

showImportSuccess(
imported
);

}
);

footer.append(
cancel,
importButton
);

box.append(
header,
body,
footer
);

modal.appendChild(
box
);

modal.addEventListener(
'click',
function (e) {

if (
e.target === modal
) {

closeQuickImportModal();

}

}
);

document.body.appendChild(
modal
);

quickImportModal =
modal;

setTimeout(
() =>
textarea.focus(),
50
);

}


/* ----------------------------------------
   IMPORT SUCCESS
---------------------------------------- */

function showImportSuccess(
count
) {

const modal =
document.createElement(
'div'
);

modal.className =
'label-quickimp-modal';

modal.setAttribute(
'role',
'dialog'
);

modal.setAttribute(
'aria-modal',
'true'
);

const box =
document.createElement(
'div'
);

box.className =
'label-quickimp-modal-box';

box.style.maxWidth =
'420px';

const header =
document.createElement(
'div'
);

header.className =
'label-quickimp-modal-header';

const title =
document.createElement(
'h2'
);

title.className =
'label-quickimp-modal-title';

title.textContent =
'Import Complete';

const closeButton =
document.createElement(
'button'
);

closeButton.type =
'button';

closeButton.className =
'label-quickimp-modal-close';

closeButton.textContent =
'×';

closeButton.setAttribute(
'aria-label',
'Close'
);

const message =
document.createElement(
'div'
);

message.style.padding =
'24px 22px';

message.style.fontSize =
'13px';

message.style.lineHeight =
'1.5';

message.innerHTML =
'<strong>' +
count +
'</strong> label' +
(
count === 1
?
''
:
's'
) +
' imported successfully.';

const footer =
document.createElement(
'div'
);

footer.className =
'label-quickimp-modal-footer';

const done =
document.createElement(
'button'
);

done.type =
'button';

done.className =
'label-quickimp-button primary';

done.textContent =
'Done';

function closeSuccess() {

modal.remove();

}

closeButton.addEventListener(
'click',
closeSuccess
);

done.addEventListener(
'click',
closeSuccess
);

header.append(
title,
closeButton
);

footer.appendChild(
done
);

box.append(
header,
message,
footer
);

modal.appendChild(
box
);

modal.addEventListener(
'click',
function (e) {

if (
e.target === modal
) {

closeSuccess();

}

}
);

document.body.appendChild(
modal
);

setTimeout(
() =>
done.focus(),
50
);

}


/* ----------------------------------------
   PRINT
---------------------------------------- */

function preparePrint() {

const old =
document.getElementById(
'label-print-root'
);

if (old) {

old.remove();

}

const config =
TEMPLATES[
state.current
];

if (!config) {

console.warn(
'[labels] No template selected to print.'
);

return null;

}

const panel =
document.querySelector(
config.panel
);

if (!panel) {

console.warn(
'[labels] Selected template panel not found:',
state.current
);

return null;

}

const pages =
panel.querySelectorAll(
'.label-page'
);

if (!pages.length) {

console.warn(
'[labels] No label pages found.'
);

return null;

}

const printRoot =
document.createElement(
'div'
);

printRoot.id =
'label-print-root';

pages.forEach(
page => {

const clone =
page.cloneNode(
true
);

clone
.querySelectorAll(
'.label-card-overlay, .label-edit-panel, .barcode-card-overlay, .barcode-edit-panel'
)
.forEach(
el =>
el.remove()
);

printRoot.appendChild(
clone
);

}
);

document.body.appendChild(
printRoot
);

return printRoot;

}


/* ----------------------------------------
   BUTTON SETUP
---------------------------------------- */

function setupQuickImport() {

const button =
els.quickImport;

if (!button) {

console.warn(
'[labels] Quick Import button not found.'
);

return;

}

if (
button.dataset.labelQuickImportReady ===
'true'
) {

return;

}

button.dataset.labelQuickImportReady =
'true';

button.addEventListener(
'click',
function (e) {

e.preventDefault();
e.stopPropagation();

openQuickImportModal();

}
);

}

function setupClearAll() {

const button =
els.clear;

if (!button) {

console.warn(
'[labels] Clear All button not found.'
);

return;

}

if (
button.dataset.labelClearReady ===
'true'
) {

return;

}

button.dataset.labelClearReady =
'true';

button.addEventListener(
'click',
function (e) {

e.preventDefault();
e.stopPropagation();

clearAllCards();

}
);

}


/* ----------------------------------------
   INIT
---------------------------------------- */

function init() {

cache();

if (
!els.panel ||
!els.pages
) {

setTimeout(
init,
100
);

return;

}

if (!ready) {

ready =
true;

cacheSources();

injectStyles();

if (els.add) {

els.add.addEventListener(
'click',
function (e) {

e.preventDefault();
e.stopPropagation();

const card =
add({

template:
state.current ||
DEFAULTS.template

});

openEdit(
card
);

}
);

}

setupQuickImport();

setupClearAll();

if (els.print) {

els.print.addEventListener(
'click',
function (e) {

e.preventDefault();
e.stopPropagation();

const printRoot =
preparePrint();

if (!printRoot) {

console.warn(
'[labels] Nothing available to print.'
);

return;

}

requestAnimationFrame(
() => {

requestAnimationFrame(
() => {

window.print();

}
);

}
);

}
);

}

const drop =
$('#label-drop');

if (drop) {

drop.style.cursor =
'pointer';

drop.addEventListener(
'click',
function (e) {

if (
e.target.closest(
'.db-list-dropdown-card[data-label-template]'
)
) {

return;

}

e.preventDefault();
e.stopPropagation();

toggleDropdown();

}
);

}

window.addEventListener(
'afterprint',
function () {

const printRoot =
document.getElementById(
'label-print-root'
);

if (printRoot) {

printRoot.remove();

}

}
);

}

createDropdown(
els.dropdown
);

render();

}


/* ----------------------------------------
   TOOL OPEN
---------------------------------------- */

document.addEventListener(
'db-tool-open',
function (e) {

if (
e.detail?.id !== 'labels'
) {

return;

}

init();

}
);


/* ----------------------------------------
   PAGE LOAD
---------------------------------------- */

if (
document.readyState ===
'loading'
) {

document.addEventListener(
'DOMContentLoaded',
init,
{
once:
true
}
);

} else {

init();

}


/* ----------------------------------------
   GLOBAL API
---------------------------------------- */

window.MTWLabelTool = {

state,

addCard:
add,

getCard:
get,

deleteCard:
remove,

clearAllCards:
clearAllCards,

render,

openEdit,

hideEdit,

selectTemplate,

openQuickImport:
openQuickImportModal,

diagnose:
function () {

console.group(
'[labels] diagnose'
);

console.log(
'current template:',
state.current
);

console.log(
'cards:',
state.cards
);

console.log(
'elements:',
{

panel:
!!els.panel,

pages:
!!els.pages,

add:
!!els.add,

print:
!!els.print,

quickImport:
!!els.quickImport,

clear:
!!els.clear,

dropdown:
!!els.dropdown

}
);

Object.entries(
TEMPLATES
).forEach(
([id, template]) => {

const panel =
document.querySelector(
template.panel
);

console.log(
id,
{

panel:
template.panel,

found:
!!panel,

cards:
state.cards.filter(
card =>
card.template === id
).length

}
);

}
);

console.groupEnd();

}

};

})();
