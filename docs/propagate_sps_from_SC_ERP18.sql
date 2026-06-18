SET NOCOUNT ON;

-- ── Source snapshot: every proc in SC_ERP18 with its definition ──
IF OBJECT_ID('tempdb..#src') IS NOT NULL DROP TABLE #src;
SELECT p.name COLLATE DATABASE_DEFAULT AS pname, m.definition AS pdef
INTO #src
FROM SC_ERP18.sys.procedures p
LEFT JOIN SC_ERP18.sys.sql_modules m ON m.object_id = p.object_id
WHERE p.is_ms_shipped = 0;

-- ── Result accumulators ──
IF OBJECT_ID('tempdb..#sum') IS NOT NULL DROP TABLE #sum;
CREATE TABLE #sum (dbname SYSNAME, created INT, failed INT, skipped INT);
IF OBJECT_ID('tempdb..#fail') IS NOT NULL DROP TABLE #fail;
CREATE TABLE #fail (dbname SYSNAME, pname SYSNAME, errmsg NVARCHAR(2000));
IF OBJECT_ID('tempdb..#miss') IS NOT NULL DROP TABLE #miss;
CREATE TABLE #miss (pname SYSNAME COLLATE DATABASE_DEFAULT, pdef NVARCHAR(MAX));

DECLARE @db SYSNAME, @q NVARCHAR(MAX), @cmd NVARCHAR(MAX),
        @pname SYSNAME, @pdef NVARCHAR(MAX), @c INT, @f INT, @s INT;

DECLARE dbc CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM sys.databases
  WHERE name LIKE 'SC[_]ERP%'
    AND name <> 'SC_ERP18'
    AND state = 0
    AND REPLACE(name,'SC_ERP','') NOT LIKE '%[^0-9]%'
    AND LEN(REPLACE(name,'SC_ERP','')) BETWEEN 1 AND 2
    AND CAST(REPLACE(name,'SC_ERP','') AS INT) BETWEEN 1 AND 50
  ORDER BY CAST(REPLACE(name,'SC_ERP','') AS INT);
OPEN dbc;
FETCH NEXT FROM dbc INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @c = 0; SET @f = 0; SET @s = 0;
  TRUNCATE TABLE #miss;

  SET @q = N'INSERT INTO #miss(pname, pdef)
    SELECT s.pname, s.pdef FROM #src s
    WHERE NOT EXISTS (
      SELECT 1 FROM ' + QUOTENAME(@db) + N'.sys.procedures p
      WHERE p.name COLLATE DATABASE_DEFAULT = s.pname COLLATE DATABASE_DEFAULT);';
  EXEC sp_executesql @q;

  DECLARE pc CURSOR LOCAL FAST_FORWARD FOR SELECT pname, pdef FROM #miss;
  OPEN pc;
  FETCH NEXT FROM pc INTO @pname, @pdef;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    IF @pdef IS NULL
      SET @s += 1;
    ELSE
    BEGIN
      BEGIN TRY
        SET @cmd = N'EXEC ' + QUOTENAME(@db) + N'.sys.sp_executesql @def';
        EXEC sp_executesql @cmd, N'@def NVARCHAR(MAX)', @def = @pdef;
        SET @c += 1;
      END TRY
      BEGIN CATCH
        SET @f += 1;
        INSERT #fail(dbname, pname, errmsg) VALUES (@db, @pname, ERROR_MESSAGE());
      END CATCH
    END
    FETCH NEXT FROM pc INTO @pname, @pdef;
  END
  CLOSE pc; DEALLOCATE pc;

  INSERT #sum(dbname, created, failed, skipped) VALUES (@db, @c, @f, @s);
  FETCH NEXT FROM dbc INTO @db;
END
CLOSE dbc; DEALLOCATE dbc;

PRINT '=== PER-DB SUMMARY ===';
SELECT dbname, created, failed, skipped FROM #sum ORDER BY CAST(REPLACE(dbname,'SC_ERP','') AS INT);
PRINT '=== TOTALS ===';
SELECT SUM(created) AS total_created, SUM(failed) AS total_failed, SUM(skipped) AS total_skipped, COUNT(*) AS dbs FROM #sum;
PRINT '=== FAILURES (if any) ===';
SELECT dbname, pname, errmsg FROM #fail ORDER BY dbname, pname;
