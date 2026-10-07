-- ---------------------------------------------------------------------------
-- VidaReal - remove os dados de EXEMPLO criados por dados-exemplo.sql
--
-- Apaga somente o que o script de exemplo criou (protocolos 'EX-', metas e
-- feedbacks com id 900000+, e os 13 cidadaos de exemplo). Dados reais nao
-- sao tocados. Pode rodar mais de uma vez sem erro.
-- ---------------------------------------------------------------------------
DELETE FROM protocolo WHERE id LIKE 'EX-%';
DELETE FROM meta WHERE id BETWEEN 900000 AND 999999;
DELETE FROM feedback WHERE id BETWEEN 900000 AND 999999;
DELETE FROM recuperacao_senha WHERE cpf_usuario IN ('90000000175', '90000000256', '90000000337', '90000000418', '90000000507', '90000000680', '90000000760', '90000000841', '90000000922', '90000001066', '90000001147', '90000001228', '90000001309');
-- So depois de remover protocolos e metas: as chaves estrangeiras apontam para usuario
DELETE FROM protocolo WHERE cpf_solicitante IN ('90000000175', '90000000256', '90000000337', '90000000418', '90000000507', '90000000680', '90000000760', '90000000841', '90000000922', '90000001066', '90000001147', '90000001228', '90000001309');
DELETE FROM meta WHERE cpf_usuario IN ('90000000175', '90000000256', '90000000337', '90000000418', '90000000507', '90000000680', '90000000760', '90000000841', '90000000922', '90000001066', '90000001147', '90000001228', '90000001309');
DELETE FROM usuario WHERE cpf IN ('90000000175', '90000000256', '90000000337', '90000000418', '90000000507', '90000000680', '90000000760', '90000000841', '90000000922', '90000001066', '90000001147', '90000001228', '90000001309');
COMMIT;
