#!/usr/bin/env python3
"""
Reorder Flow metadata XML so element types are alphabetically grouped
and contiguous, as required by the Salesforce Metadata API.
"""
import sys
from lxml import etree

NS = "http://soap.sforce.com/2006/04/metadata"
NSMAP = {"sf": NS}

# Order Salesforce Metadata API expects for Flow children (subset of full schema).
ELEMENT_ORDER = [
    "actionCalls",
    "apexPluginCalls",
    "apiVersion",
    "assignments",
    "choices",
    "collectionProcessors",
    "constants",
    "customErrors",
    "customProperties",
    "decisions",
    "description",
    "dynamicChoiceSets",
    "environments",
    "exitRules",
    "formulas",
    "interviewLabel",
    "isAdditionalPermissionRequiredToRun",
    "isTemplate",
    "label",
    "loops",
    "migratedFromWorkflowRuleName",
    "orchestratedStages",
    "processMetadataValues",
    "processType",
    "recordCreates",
    "recordDeletes",
    "recordLookups",
    "recordRollbacks",
    "recordUpdates",
    "runInMode",
    "screens",
    "stages",
    "start",
    "status",
    "steps",
    "subflows",
    "textTemplates",
    "transforms",
    "triggerOrder",
    "variables",
    "waits",
]


def reorder(path: str) -> bool:
    parser = etree.XMLParser(remove_blank_text=False)
    tree = etree.parse(path, parser)
    root = tree.getroot()

    children = list(root)
    grouped = {tag: [] for tag in ELEMENT_ORDER}
    other = []
    for child in children:
        tag = etree.QName(child).localname
        if tag in grouped:
            grouped[tag].append(child)
        else:
            other.append(child)
    # remove all children
    for c in children:
        root.remove(c)
    # re-add in canonical order
    for tag in ELEMENT_ORDER:
        for c in grouped[tag]:
            root.append(c)
    for c in other:
        root.append(c)

    tree.write(path, xml_declaration=True, encoding="UTF-8", pretty_print=False)
    return True


if __name__ == "__main__":
    for p in sys.argv[1:]:
        ok = reorder(p)
        print(f"{p}: {'reordered' if ok else 'FAILED'}")
