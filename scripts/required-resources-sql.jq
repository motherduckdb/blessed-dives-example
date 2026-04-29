def sqlEscape: gsub("'"; "''");

"[" + ([.requiredResources[] |
  "{'url': '" + (.url | sqlEscape) + "', 'alias': '" + (.alias | sqlEscape) + "'}"
] | join(", ")) + "]"
